"""Decisión de destinos (RN-E1 a E11). Función pura sobre la tabla base RN-E2."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .evaluacion import Evaluacion
from .identidad import PackPais
from .modelos import Canal, Clasificacion, Destino, EstadoIdentidad, Extraccion, Prioridad, TipoDocumento

T, P, D = TipoDocumento, Prioridad, Destino
CANALES_SIN_AUDITORIA = {Canal.GUARDIA.value, Canal.HOSPITALIZADO.value}     # RN-E4


@dataclass
class Ruta:
    principal: Optional[Destino] = None
    secundarios: list[Destino] = field(default_factory=list)
    retenidos: list[Destino] = field(default_factory=list)      # RN-A4/N3: HCE retenida
    avisos: list[str] = field(default_factory=list)             # p. ej. "solicitante"
    banderas: dict = field(default_factory=dict)
    motivos_revision: list[str] = field(default_factory=list)   # RN-E10/E11

    @property
    def todos(self) -> list[Destino]:
        return [d for d in [self.principal, *self.secundarios] if d is not None]


def decidir_ruta(*, tipo: Optional[TipoDocumento], ev: Evaluacion, ext: Extraccion,
                 canal: str, pack: PackPais, cobertura: Optional[str], revisado: bool = False) -> Ruta:
    r = Ruta()
    crit, urg = ev.prioridad is P.CRITICO, ev.prioridad is P.URGENTE

    if tipo in (T.IMAGENES, T.LABORATORIO):
        if crit: r.principal, r.secundarios = D.EMERGENCIA, [D.HCE]
        elif urg: r.principal, r.avisos = D.HCE, ["solicitante"]
        else: r.principal = D.HCE

    elif tipo is T.RECETA:
        r.principal = D.FARMACIA
        if crit:
            r.secundarios = [D.EMERGENCIA]
            r.banderas["farmacia_prioritaria"] = True
        if ev.alto_riesgo:
            r.banderas.update(alto_riesgo=True, verificaciones_requeridas=2)       # RN-E6

    elif tipo is T.ORDEN:
        _ruta_orden(r, crit, urg, ext, canal, pack, cobertura, revisado)

    elif tipo is T.EPICRISIS:
        r.principal = D.HCE
        if crit and ext.hallazgo_pendiente: r.secundarios = [D.EMERGENCIA]
        if urg: r.banderas["control_en_dias"] = 7

    elif tipo is T.CERTIFICADO:
        r.principal = D.HCE

    else:                                       # tipo desconocido: solo puede pasar tras resolución humana
        r.principal = D.HCE

    # RN-E7: programa de cobertura del país
    programas = dict(pack.programas)
    activados = [programas[c] for c in ev.conceptos_criticos + ev.conceptos_urgentes if c in programas]
    if activados:
        r.secundarios.append(D.PROGRAMA)
        r.banderas["programa_cobertura"] = activados[0]

    # RN-A4 / RN-N3: identificador ausente retiene SOLO la entrega a la HCE
    if ev.estado_identidad is EstadoIdentidad.AUSENTE and D.HCE in r.todos:
        r.retenidos.append(D.HCE)
    return r


def _ruta_orden(r: Ruta, crit: bool, urg: bool, ext: Extraccion, canal: str, pack: PackPais,
                cobertura: Optional[str], revisado: bool) -> None:
    if crit or canal in CANALES_SIN_AUDITORIA:          # RN-E2 (crítico) y RN-E4 (caso 5)
        r.principal = D.EMERGENCIA
        r.banderas["sin_autorizacion_previa"] = True
        return
    # Colombia: la orden ambulatoria/externa va a Auditoría para autorización del asegurador (EPS).
    r.principal = D.AUDITORIA
    if urg: r.banderas["via_rapida"] = True
    faltantes = [n for n in ("sintomas", "hallazgos_previos", "diagnostico_texto", "diagnostico_codigo")
                 if not (getattr(ext, n).valor or "").strip()]                      # RN-E5
    if faltantes:
        r.banderas.update(documentacion_incompleta=True, faltantes=faltantes)
        r.avisos.append("solicitante")
