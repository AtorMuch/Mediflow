"""Etapa EVALUADO: compone las reglas puras en una decisión (prioridad + motivos de revisión).

Función pura: mismos datos de entrada, misma decisión. Es lo que se re-ejecuta tras una
corrección humana (RN-J4), sin volver a llamar al LLM.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from .config import Config
from .identidad import obtener_pack, validar_identidad
from .modelos import (Campo, Clasificacion, EstadoIdentidad, Extraccion, Prioridad, TipoDocumento)
from .reglas_clinicas import (CRITICOS, URGENTES, ResultadoNews2, detectar, es_alto_riesgo, evaluar_news2)

T = TipoDocumento

OBLIGATORIOS_COMUNES = ("paciente_nombre", "paciente_edad", "profesional", "fecha_documento")   # RN-C1
OBLIGATORIOS_POR_TIPO: dict[TipoDocumento, tuple[str, ...]] = {
    T.IMAGENES: ("estudio", "hallazgos", "conclusion", "diagnostico_texto", "diagnostico_codigo"),
    T.LABORATORIO: ("estudio", "hallazgos", "conclusion", "diagnostico_texto", "diagnostico_codigo"),
    T.ORDEN: ("procedimiento", "indicacion_clinica", "diagnostico_texto", "diagnostico_codigo"),
    T.EPICRISIS: ("diagnostico_egreso", "tratamiento_indicado", "control_programado"),
}
CAMPOS_MEDICAMENTO = ("nombre", "dosis", "via", "frecuencia", "duracion")


@dataclass
class Evaluacion:
    prioridad: Prioridad = Prioridad.RUTINA
    prioridad_llm: Prioridad = Prioridad.RUTINA
    reglas: list[dict] = field(default_factory=list)          # RN-G2: regla, evidencia, decisión
    motivos_revision: list[str] = field(default_factory=list)
    campos_dudosos: list[dict] = field(default_factory=list)
    estado_identidad: EstadoIdentidad = EstadoIdentidad.AUSENTE
    alto_riesgo: bool = False
    conceptos_criticos: list[str] = field(default_factory=list)
    conceptos_urgentes: list[str] = field(default_factory=list)
    news2: Optional[dict] = None

    @property
    def es_critico(self) -> bool:
        return self.prioridad is Prioridad.CRITICO

    def a_dict(self) -> dict:
        return {k: (v.value if hasattr(v, "value") else v) for k, v in self.__dict__.items()}

    @classmethod
    def desde_dict(cls, d: dict) -> "Evaluacion":
        d = dict(d)
        d["prioridad"] = Prioridad(d["prioridad"])
        d["prioridad_llm"] = Prioridad(d["prioridad_llm"])
        d["estado_identidad"] = EstadoIdentidad(d["estado_identidad"])
        return cls(**d)


def _umbral(campo: str, cfg: Config) -> float:
    u = cfg.umbrales
    if campo.startswith("paciente_"): return u.identidad
    if campo in ("medicamento.nombre", "medicamento.dosis"): return u.medicamento_dosis
    if campo in ("diagnostico_texto", "diagnostico_codigo", "diagnostico_egreso"): return u.diagnostico_codigo
    if campo == "profesional": return u.profesional
    return u.resto


def _vacio(c: Optional[Campo]) -> bool:
    return c is None or c.valor is None or not str(c.valor).strip()


def _edad(ext: Extraccion) -> Optional[int]:
    m = re.search(r"\d{1,3}", ext.paciente_edad.valor or "")
    return int(m.group(0)) if m else None


def _campos_obligatorios(tipo: Optional[TipoDocumento], ext: Extraccion) -> list[tuple[str, Campo | None]]:
    lista: list[tuple[str, Campo | None]] = [(n, getattr(ext, n)) for n in OBLIGATORIOS_COMUNES]
    if tipo in OBLIGATORIOS_POR_TIPO:
        lista += [(n, getattr(ext, n)) for n in OBLIGATORIOS_POR_TIPO[tipo]]
    if tipo is T.RECETA:
        if not ext.medicamentos:
            lista.append(("medicamento", None))
        for i, med in enumerate(ext.medicamentos):
            lista += [(f"medicamento[{i}].{n}", getattr(med, n)) for n in CAMPOS_MEDICAMENTO]
    return lista


def evaluar(*, texto: str, clasificacion: Optional[Clasificacion], extraccion: Optional[Extraccion],
            pais: str, config: Config, motivos_previos: tuple[str, ...] = (),
            revisado_por_humano: bool = False) -> Evaluacion:
    ev = Evaluacion()
    ext = extraccion or Extraccion()
    tipo = clasificacion.tipo if clasificacion else None

    # ---- Identidad (RN-A4) -------------------------------------------------------------
    ev.estado_identidad = validar_identidad(ext.paciente_id.valor)

    # ---- Motivos de revisión (RN-C1, C3, A4, N) — no aplican si un humano ya resolvió ----
    if not revisado_por_humano:
        ev.motivos_revision = list(dict.fromkeys(motivos_previos))
        for nombre, campo in _campos_obligatorios(tipo, ext):
            if _vacio(campo):
                ev.campos_dudosos.append({"campo": nombre, "razon": "faltante"})
            else:
                base = nombre.split("].")[-1] if "]" in nombre else nombre
                u = _umbral("medicamento." + base if nombre.startswith("medicamento[") else nombre, config)
                if campo.confianza < u:
                    ev.campos_dudosos.append({"campo": nombre, "razon": "confianza_baja",
                                              "confianza": campo.confianza, "umbral": u})
        if ev.estado_identidad is EstadoIdentidad.INVALIDO:
            ev.motivos_revision.append("identidad_invalida")
            ev.campos_dudosos.append({"campo": "paciente_id", "razon": "invalido"})
        elif not _vacio(ext.paciente_id) and ext.paciente_id.confianza < config.umbrales.identidad:
            ev.campos_dudosos.append({"campo": "paciente_id", "razon": "confianza_baja",
                                      "confianza": ext.paciente_id.confianza, "umbral": config.umbrales.identidad})
        if any(c["razon"] == "faltante" for c in ev.campos_dudosos):
            ev.motivos_revision.append("campos_obligatorios_faltantes")
        if any(c["razon"] in ("confianza_baja", "invalido") for c in ev.campos_dudosos):
            ev.motivos_revision.append("campos_dudosos")

    # ---- Conceptos críticos y urgentes (RN-D1, D2, D6) -------------------------------------
    codigo = ext.diagnostico_codigo.valor
    crit = detectar(CRITICOS, codigo, texto)
    urg = detectar(URGENTES, codigo, texto)
    ev.conceptos_criticos, ev.conceptos_urgentes = crit.conceptos, urg.conceptos
    for h in crit.hallazgos:
        ev.reglas.append({"regla": "RN-D2", "nivel": "Crítico", "concepto": h.concepto, "via": h.via, "evidencia": h.evidencia})
    for h in crit.negados:
        ev.reglas.append({"regla": "RN-D2", "nivel": "sin efecto", "concepto": h.concepto, "via": "texto_negado", "evidencia": h.evidencia})
    for h in urg.hallazgos:
        ev.reglas.append({"regla": "RN-D6", "nivel": "Urgente", "concepto": h.concepto, "via": h.via, "evidencia": h.evidencia})

    # ---- NEWS2 (RN-D3, D4, N1, N2, N4) ----------------------------------------------------
    n2: ResultadoNews2 = evaluar_news2(ext.signos_vitales, _edad(ext), ext.hipercapnico_documentado, ext.embarazo)
    ev.news2 = {"aplica": n2.aplica, "total": n2.total, "criticos": n2.criticos, "parcial": n2.parcial,
                "escala_spo2": n2.escala_spo2, "motivo_no_aplica": n2.motivo_no_aplica}
    if n2.es_critico:
        ev.reglas.append({"regla": "RN-D3", "nivel": "Crítico", "evidencia": f"NEWS2={n2.total}; parámetros={n2.criticos}"})
    if (not revisado_por_humano and not n2.aplica and n2.motivo_no_aplica
            and n2.motivo_no_aplica != "sin_signos_vitales"):
        ev.motivos_revision.append(f"news2_no_aplica_{n2.motivo_no_aplica}")

    # ---- Prioridad (RN-D8: las reglas suben, nunca bajan) -----------------------------------
    p_reglas = Prioridad.CRITICO if (crit.hallazgos or n2.es_critico) else \
        Prioridad.URGENTE if urg.hallazgos else Prioridad.RUTINA
    ev.prioridad_llm = Prioridad.maxima(clasificacion.prioridad_propuesta if clasificacion else Prioridad.RUTINA,
                                        ext.prioridad_propuesta)
    ev.prioridad = Prioridad.maxima(ev.prioridad_llm, p_reglas)
    if ev.prioridad.rango > ev.prioridad_llm.rango:
        ev.reglas.append({"regla": "RN-D8", "llm_propuso": ev.prioridad_llm.value,
                          "regla_eleva_a": ev.prioridad.value})

    # ---- Alto riesgo (RN-E6) ------------------------------------------------------------------
    if tipo is T.RECETA:
        ev.alto_riesgo = any(es_alto_riesgo(m.nombre.valor, m.via.valor) for m in ext.medicamentos)
        if ev.alto_riesgo:
            ev.reglas.append({"regla": "RN-E6", "evidencia": "medicamento de alto riesgo (lista ISMP)"})

    ev.motivos_revision = list(dict.fromkeys(ev.motivos_revision))
    return ev
