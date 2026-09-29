"""Reglas clínicas determinísticas (sección 4.1 y 4.2). Funciones puras, sin LLM.

RN-D5 / RN-L2: los criterios clínicos están fijos en código, no en configuración.
Todo lo marcado `# TODO clínico` debe ser validado por el equipo médico antes de producción.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Optional

from .modelos import SignosVitales


def normalizar(texto: str) -> str:
    """Minúsculas y sin tildes, para comparar sinónimos."""
    nfd = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


# ------------------------------------------------------------------ conceptos ---

@dataclass(frozen=True)
class Concepto:
    nombre: str
    codigos: tuple[str, ...] = ()          # prefijos CIE-10 y CIE-11 (RN-D2 vía 1)
    terminos: tuple[str, ...] = ()         # regex sobre texto sin tildes (RN-D2 vía 2)
    codigo_requiere_texto: Optional[str] = None   # el código solo cuenta si el texto lo confirma


# Códigos tomados de la tabla RN-D1. El documento pide confirmar los CIE-11 en icd.who.int/ct.
CRITICOS: tuple[Concepto, ...] = (         # RN-D1 / RN-D2
    Concepto("TEP_AGUDO", ("I26.0", "I26.9", "BB00.0"),
             (r"tromboembolismo pulmonar", r"tromboembolia pulmonar", r"embolia pulmonar",
              r"embolismo pulmonar", r"\btep\b")),
    Concepto("IAM_STEMI", ("I21.0", "I21.1", "I21.2", "I21.3", "BA41.0", "BA41.Z"),
             (r"\bstemi\b", r"\biamcest\b", r"infarto agudo de miocardio con elevacion",
              r"infarto con supradesnivel", r"supradesnivel del st")),
    Concepto("DISECCION_AORTICA", ("I71.0", "BD50.0", "BD50.1", "BD50.2"),
             (r"diseccion aortica", r"diseccion de (?:la )?aorta")),
    Concepto("NEUMOTORAX_TENSION", ("J93", "CB21"),
             (r"neumotorax (?:a|con) tension", r"neumotorax hipertensivo",
              r"neumotorax con desviacion mediastinica"),
             codigo_requiere_texto=r"tension|desviacion mediastinica"),
    Concepto("TAPONAMIENTO_CARDIACO", ("I31.4", "I31.9", "BB23"),
             (r"taponamiento (?:cardiaco|pericardico)",)),
    Concepto("INSUF_RESPIRATORIA_AGUDA", ("J96.0", "CB41.0"),
             (r"insuficiencia respiratoria aguda",)),
    Concepto("ARRITMIA_MALIGNA", ("I47.2", "I49.0", "I44.2", "BC71.0", "BC71.1", "BC63.2"),
             (r"fibrilacion ventricular", r"taquicardia ventricular", r"bloqueo (?:auriculoventricular|av) completo",
              r"asistolia")),
    Concepto("EDEMA_AGUDO_PULMON", ("I50.1", "J81", "CB01"),
             (r"edema agudo de pulmon", r"edema pulmonar agudo")),
)

URGENTES: tuple[Concepto, ...] = (         # RN-D6  # TODO clínico: validar lista y códigos
    Concepto("ANGINA_INESTABLE", ("I20.0",), (r"angina inestable",)),
    Concepto("IC_DESCOMPENSADA", (), (r"insuficiencia cardiaca descompensada", r"\bicc? descompensada",
                                      r"descompensacion de (?:la )?insuficiencia cardiaca")),
    Concepto("EPOC_EXACERBACION", ("J44.1",), (r"exacerbacion de (?:la )?epoc", r"epoc (?:exacerbad|reagudizad)")),
    Concepto("ASMA_EXACERBACION", ("J46",), (r"exacerbacion asmatica", r"crisis asmatica", r"asma (?:agudizad|exacerbad)")),
    Concepto("DERRAME_PLEURAL", ("J90",), (r"derrame pleural (?:significativo|masivo|moderado a severo)",)),
    Concepto("HEMOPTISIS", ("R04.2",), (r"hemoptisis",)),
    Concepto("SINCOPE_CARDIACO", (), (r"sincope cardiaco", r"sincope de origen cardiaco")),
)

# RN-D2: una mención negada o antecedente no es un hallazgo activo.
# ADICIÓN DE DISEÑO (no está en el documento): sin esto, todo informe normal
# ("sin evidencia de TEP") dispararía una alerta crítica.
_NEGADORES = re.compile(
    r"\b(?:sin|no|ni|descarta\w*|ausencia|niega|negativo|libre|antecedentes?|historia|previo|previa|resuelto)\b")


def _prefijo_de_oracion(texto_norm: str, inicio: int) -> str:
    """Palabras de la misma cláusula (hasta la última puntuación) antes del término."""
    previo = texto_norm[:inicio]
    corte = max(previo.rfind(c) for c in ".;:,\n")
    clausula = previo[corte + 1:]
    return " ".join(clausula.split()[-6:])


@dataclass
class Hallazgo:
    concepto: str
    via: str                 # "codigo" | "texto"
    evidencia: str           # código o término (sin datos del paciente)


@dataclass
class Deteccion:
    hallazgos: list[Hallazgo] = field(default_factory=list)   # menciones activas
    negados: list[Hallazgo] = field(default_factory=list)     # negadas o antecedente: sin efecto

    @property
    def conceptos(self) -> list[str]:
        return list(dict.fromkeys(h.concepto for h in self.hallazgos))


def _codigo_coincide(codigo: str, prefijos: tuple[str, ...]) -> bool:
    c = codigo.upper().replace(" ", "")
    return any(c.startswith(p) for p in prefijos)


def detectar(conceptos: tuple[Concepto, ...], codigo: Optional[str], texto: str) -> Deteccion:
    """RN-D2: por código o por término textual con sinónimos. Basta una vía."""
    norm = normalizar(texto or "")
    res = Deteccion()
    for c in conceptos:
        if codigo and _codigo_coincide(codigo, c.codigos):
            if not (c.codigo_requiere_texto and not re.search(c.codigo_requiere_texto, norm)):
                res.hallazgos.append(Hallazgo(c.nombre, "codigo", codigo.upper()))
                continue
        activa = False
        negada: Optional[Hallazgo] = None
        for patron in c.terminos:
            m = re.search(patron, norm)
            if not m:
                continue
            h = Hallazgo(c.nombre, "texto", patron)
            if _NEGADORES.search(_prefijo_de_oracion(norm, m.start())):
                negada = negada or h
            else:
                res.hallazgos.append(h)
                activa = True
                break
        if negada and not activa:
            res.negados.append(negada)
    return res


# ---------------------------------------------------------------------- NEWS2 ---

@dataclass
class ResultadoNews2:
    aplica: bool
    motivo_no_aplica: str = ""
    total: int = 0
    faltantes: list[str] = field(default_factory=list)
    criticos: list[str] = field(default_factory=list)                # RN-D3: parámetros individuales
    escala_spo2: int = 1

    @property
    def parcial(self) -> bool:
        """Con datos incompletos el total puede subestimar; se informa (no se inventa)."""
        return self.aplica and bool(self.faltantes)

    @property
    def es_critico(self) -> bool:
        return self.aplica and (self.total >= 7 or bool(self.criticos))


def _pts_fr(v: float) -> int:
    return 3 if v <= 8 else 1 if v <= 11 else 0 if v <= 20 else 2 if v <= 24 else 3


def _pts_spo2_escala1(v: float) -> int:
    return 3 if v <= 91 else 2 if v <= 93 else 1 if v <= 95 else 0


def _pts_spo2_escala2(v: float, con_oxigeno: bool) -> int:
    """Escala 2 (RCP 2017): objetivo 88-92 %. Con oxígeno, una saturación ALTA puntúa (hiperoxia)."""
    if v <= 83: return 3
    if v <= 85: return 2
    if v <= 87: return 1
    if v <= 92: return 0
    if not con_oxigeno: return 0
    return 1 if v <= 94 else 2 if v <= 96 else 3


def _pts_pas(v: float) -> int:
    return 3 if v <= 90 else 2 if v <= 100 else 1 if v <= 110 else 0 if v < 220 else 3


def _pts_fc(v: float) -> int:
    return 3 if v <= 40 else 1 if v <= 50 else 0 if v <= 90 else 1 if v <= 110 else 2 if v <= 130 else 3


def _pts_temp(v: float) -> int:
    return 3 if v <= 35.0 else 1 if v <= 36.0 else 0 if v <= 38.0 else 1 if v <= 39.0 else 2


def evaluar_news2(sv: Optional[SignosVitales], edad: Optional[int], hipercapnico: bool = False,
                   embarazo: bool = False) -> ResultadoNews2:
    """NEWS2 (RN-D3/D4/N1/N2/N4). Con datos parciales suma lo disponible y lo informa.

    RN-D3: un parámetro individual con 3 puntos ("puntaje rojo" RCP) es crítico por sí solo.
    # TODO clínico: (1) validar con el equipo médico; (2) en altitud (Bogotá ~2.600 m, Tunja ~2.800 m,
    # Boyacá en general) la SpO2 normal en reposo es menor que a nivel del mar; definir si se ajusta
    # el umbral de SpO2 para no generar alertas críticas de más (fatiga de alarmas).
    """
    if sv is None:
        return ResultadoNews2(aplica=False, motivo_no_aplica="sin_signos_vitales")
    tiene_alguno = any(v is not None for v in (sv.fr, sv.spo2, sv.fc, sv.pas, sv.temperatura, sv.conciencia_alterada))
    if not tiene_alguno:
        return ResultadoNews2(aplica=False, motivo_no_aplica="sin_signos_vitales")
    if edad is None:
        return ResultadoNews2(aplica=False, motivo_no_aplica="edad_ausente")            # RN-N4
    if edad < 16:
        return ResultadoNews2(aplica=False, motivo_no_aplica="menor_de_16")                 # RN-N1
    if embarazo:
        return ResultadoNews2(aplica=False, motivo_no_aplica="embarazo")                    # RN-N2

    r = ResultadoNews2(aplica=True, escala_spo2=2 if hipercapnico else 1)
    ind: list[str] = []

    def sumar(nombre: str, pts: int) -> None:
        r.total += pts
        if pts == 3:
            ind.append(nombre)

    if sv.fr is None: r.faltantes.append("fr")
    else: sumar("fr", _pts_fr(sv.fr))
    if sv.spo2 is None: r.faltantes.append("spo2")
    elif hipercapnico:                                      # RN-D4  # TODO clínico: confirmar ≤83 como crítico
        sumar("spo2", _pts_spo2_escala2(sv.spo2, bool(sv.oxigeno_suplementario)))
    else:
        sumar("spo2", _pts_spo2_escala1(sv.spo2))
    if sv.oxigeno_suplementario:
        r.total += 2
    if sv.pas is None: r.faltantes.append("pas")
    else: sumar("pas", _pts_pas(sv.pas))
    if sv.fc is None: r.faltantes.append("fc")
    else: sumar("fc", _pts_fc(sv.fc))
    if sv.conciencia_alterada is None: r.faltantes.append("conciencia")
    elif sv.conciencia_alterada:
        sumar("conciencia", 3)
    if sv.temperatura is None: r.faltantes.append("temperatura")
    else: sumar("temperatura", _pts_temp(sv.temperatura))
    r.criticos = ind
    return r


# ----------------------------------------------------------------- medicamentos ---

MARCAS_A_DCI = {   # RN-C9: la marca se normaliza a la DCI. TODO: ampliar con el vademécum del país.
    "eliquis": "apixaban", "xarelto": "rivaroxaban", "pradaxa": "dabigatran", "sintrom": "acenocumarol",
    "coumadin": "warfarina", "lovenox": "enoxaparina", "clexane": "enoxaparina", "lanoxin": "digoxina",
    "cordarone": "amiodarona", "cozaar": "losartan", "aldactone": "espironolactona",
}
ANTICOAGULANTES = {"warfarina", "acenocumarol", "apixaban", "rivaroxaban", "dabigatran", "edoxaban",
                   "heparina", "enoxaparina", "fondaparinux"}
SIEMPRE_ALTO_RIESGO = ANTICOAGULANTES | {
    "digoxina", "alteplasa", "tenecteplasa", "reteplasa", "estreptoquinasa",
    "dobutamina", "dopamina", "noradrenalina", "norepinefrina", "adrenalina", "epinefrina",
    "vasopresina", "milrinona"}
ALTO_RIESGO_SI_IV = {"amiodarona", "lidocaina", "procainamida", "morfina", "fentanilo", "metadona",
                     "hidromorfona", "meperidina"}          # antiarrítmicos y opioides IV (RN-E6)
_VIA_IV = re.compile(r"\b(?:iv|ev|intravenos\w*|endovenos\w*)\b")


def normalizar_dci(nombre: Optional[str]) -> str:
    n = normalizar(nombre or "").strip()
    primera = re.split(r"[\s,/]+", n)[0] if n else ""
    return MARCAS_A_DCI.get(primera, primera)


def es_alto_riesgo(nombre: Optional[str], via: Optional[str]) -> bool:
    dci = normalizar_dci(nombre)
    if dci in SIEMPRE_ALTO_RIESGO:
        return True
    return dci in ALTO_RIESGO_SI_IV and bool(_VIA_IV.search(normalizar(via or "")))


calcular_news2 = evaluar_news2   # alias
