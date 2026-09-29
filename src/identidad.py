"""Validación de identidad del paciente: instalación exclusiva para Colombia (RN-A3, RN-S2).

Documentos de identidad colombianos soportados (con su formato numérico). Ninguno de ellos
lleva dígito verificador, así que lo máximo que se puede afirmar es `valido_formato`; solo un
cruce con la Registraduría / ADRES podría dar `valido_verificado` (pendiente de integración).

    CC   Cédula de ciudadanía            6 a 10 dígitos
    TI   Tarjeta de identidad           10 a 11 dígitos
    RC   Registro civil / NUIP           7 a 11 dígitos
    CE   Cédula de extranjería           4 a 7 dígitos
    PPT  Permiso por Protección Temporal 6 a 8 dígitos
    PEP  Permiso Especial de Permanencia 6 a 15 dígitos
    PA   Pasaporte                       5 a 12 caracteres alfanuméricos

El valor puede venir con prefijo ("CC 79.123.456", "TI: 1098765432", "Pasaporte AB123456");
sin prefijo se asume cédula de ciudadanía (CC), que es el caso más común.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Callable, NamedTuple, Optional

from .modelos import EstadoIdentidad

PAIS = "CO"
TIPO_POR_DEFECTO = "CC"

_DIGITOS = lambda a, b: re.compile(rf"\d{{{a},{b}}}")          # noqa: E731

FORMATOS_DOCUMENTO: dict[str, re.Pattern] = {
    "CC": _DIGITOS(6, 10),
    "TI": _DIGITOS(10, 11),
    "RC": _DIGITOS(7, 11),
    "CE": _DIGITOS(4, 7),
    "PPT": _DIGITOS(6, 8),
    "PEP": _DIGITOS(6, 15),
    "PA": re.compile(r"[A-Z0-9]{5,12}"),
}

# Prefijo escrito -> tipo. Se prueba de más largo a más corto.
_PREFIJOS: tuple[tuple[str, str], ...] = (
    (r"c[eé]dula\s+de\s+ciudadan[ií]a", "CC"),
    (r"c[eé]dula\s+de\s+extranjer[ií]a", "CE"),
    (r"tarjeta\s+de\s+identidad", "TI"),
    (r"registro\s+civil", "RC"),
    (r"permiso\s+por\s+protecci[oó]n\s+temporal", "PPT"),
    (r"permiso\s+especial\s+de\s+permanencia", "PEP"),
    (r"pasaporte", "PA"),
    (r"c[eé]dula", "CC"),
    (r"nuip", "RC"),
    (r"c\.?\s?c\.?", "CC"),
    (r"t\.?\s?i\.?", "TI"),
    (r"r\.?\s?c\.?", "RC"),
    (r"c\.?\s?e\.?", "CE"),
    (r"ppt", "PPT"),
    (r"pep", "PEP"),
    (r"p\.?\s?a\.?", "PA"),
)
_RE_PREFIJO = [(re.compile(rf"^\s*{p}(?![a-záéíóúñ])\s*[:#.\-]?\s*", re.I), t) for p, t in _PREFIJOS]


class Identificador(NamedTuple):
    tipo: str            # CC | TI | RC | CE | PPT | PEP | PA
    numero: str          # normalizado: sin puntos, espacios ni guiones, en mayúsculas
    tipo_explicito: bool  # False = se asumió CC por falta de prefijo


def parsear_identificador(valor: str) -> Identificador:
    """Separa el tipo de documento (si viene) del número y normaliza este último."""
    texto = valor.strip()
    for patron, tipo in _RE_PREFIJO:
        m = patron.match(texto)
        if m and texto[m.end():].strip():
            return Identificador(tipo, _normalizar(texto[m.end():]), True)
    return Identificador(TIPO_POR_DEFECTO, _normalizar(texto), False)


def _normalizar(numero: str) -> str:
    return re.sub(r"[.\-\s]", "", numero).upper()


@dataclass(frozen=True)
class PackPais:
    codigo: str
    nombre_identificador: str
    separador_decimal: str = ","
    # RN-E7: concepto clínico -> programa de cobertura (ampliable). Vacío hasta definir con la clínica.
    programas: tuple[tuple[str, str], ...] = ()
    # En Colombia la autorización de servicios la da el asegurador (EPS / medicina prepagada).
    modelo_autorizacion: str = "asegurador"


PACK_COLOMBIA = PackPais(codigo=PAIS, nombre_identificador="documento de identidad")


def obtener_pack(pais: Optional[str] = None) -> PackPais:
    """Instalación exclusiva Colombia: siempre devuelve el pack CO (el argumento se conserva
    por compatibilidad; el rechazo de otros países ocurre en la validación del request)."""
    return PACK_COLOMBIA


def validar_identidad(valor: Optional[str]) -> EstadoIdentidad:
    if valor is None or not valor.strip():
        return EstadoIdentidad.AUSENTE
    ident = parsear_identificador(valor)
    formato = FORMATOS_DOCUMENTO[ident.tipo]
    return EstadoIdentidad.VALIDO_FORMATO if formato.fullmatch(ident.numero) else EstadoIdentidad.INVALIDO
