"""Seudonimización previa al LLM (RN-M1) para la ruta de texto.

El mapa token -> valor real NUNCA sale de la instalación: vive en el estado local y solo
se usa para re-identificar los campos extraídos. Los logs no contienen datos (RN-M4).

LIMITACIÓN: los nombres en texto libre no se detectan con regex. Cubre nombres con
etiqueta ("Paciente: ...", "Dr. ..."), nombres conocidos que traiga el request y los
demás identificadores. Para producción conviene sumar NER (p. ej. Presidio con spaCy es).
"""
from __future__ import annotations

import re
from typing import Iterable, Optional

_NOM = r"[A-ZÁÉÍÓÚÑ][\wáéíóúñ'\-]+"

# Etiquetas de documento colombiano (CC, TI, RC, CE, PPT, PEP, NUIP, pasaporte, "cédula de ...").
_ETIQUETA_ID = (
    r"(?:c[eé]dula\s+de\s+ciudadan[ií]a|c[eé]dula\s+de\s+extranjer[ií]a|tarjeta\s+de\s+identidad|"
    r"registro\s+civil|permiso\s+por\s+protecci[oó]n\s+temporal|permiso\s+especial\s+de\s+permanencia|"
    r"c[eé]dula|pasaporte|nuip|ppt|pep|c\.?\s?c\.?|t\.?\s?i\.?|r\.?\s?c\.?|c\.?\s?e\.?|"
    r"documento(?:\s+de\s+identidad)?|identificaci[oó]n|n[uú]mero\s+de\s+documento|"
    r"historia\s+cl[ií]nica(?:\s+n[oº°.]*)?|hc)"
)
# El valor DEBE contener al menos un dígito: así "cédula de ciudadanía" nunca se toma como número.
_VALOR_ID = r"((?=[A-Z0-9.\-]*\d)[A-Z0-9][A-Z0-9.\-]{3,18}[A-Z0-9])"

# (etiqueta del token, regex, grupo a reemplazar)
_PATRONES: list[tuple[str, re.Pattern, int]] = [
    ("EMAIL", re.compile(r"[\w.+\-]+@[\w\-]+(?:\.[\w\-]+)+"), 0),
    ("ID", re.compile(rf"(?i)\b{_ETIQUETA_ID}[ \t]*[:#.]?[ \t]*{_VALOR_ID}"), 1),
    ("ID", re.compile(r"\b\d{1,3}(?:\.\d{3}){2,3}\b"), 0),                 # 1.020.304.050 / 52.345.678
    ("TEL", re.compile(r"(?i)\b(?:tel[eé]fono|tel|celular|cel|m[oó]vil|whatsapp|fijo)[ \t]*[:.]?[ \t]*(\+?\d[\d \-()]{6,16}\d)"), 1),
    ("TEL", re.compile(r"\+57[ \-]?\(?\d[\d \-()]{6,14}\d"), 0),                # +57 310 456 7890
    ("TEL", re.compile(r"\b3\d{2}[ \-]?\d{3}[ \-]?\d{4}\b"), 0),                   # celular colombiano (10 dígitos, inicia en 3)
    ("TEL", re.compile(r"\b60\d[ \-]?\d{3}[ \-]?\d{4}\b"), 0),                    # fijo con indicativo (601, 602, 604...)
    ("TEL", re.compile(r"\+\d{1,3}[ \-]?\d[\d \-]{6,12}\d"), 0),
    ("FECHA", re.compile(r"\b\d{4}-\d{2}-\d{2}\b"), 0),
    ("FECHA", re.compile(r"\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b"), 0),
    ("FECHA", re.compile(
        r"(?i)\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|"
        r"setiembre|octubre|noviembre|diciembre)(?:\s+de\s+\d{4})?"), 0),
    ("DIR", re.compile(r"(?im)\b(?:direcci[oó]n|domicilio|residencia|barrio)\s*:\s*([^\n]+)"), 1),
    ("PROF", re.compile(rf"\bDr\.?a?\.?[ \t]+({_NOM}(?:[ \t]+{_NOM}){{0,3}})"), 1),
    ("PACIENTE", re.compile(r"(?im)\b(?:paciente|nombre(?: completo)?|nombres|apellidos)\s*:\s*([^\n,;]+)"), 1),
    ("PROF", re.compile(r"(?im)\b(?:m[eé]dico|profesional|solicitante)\s*:\s*([^\n,;]+)"), 1),
]


class Seudonimizador:
    def __init__(self, nombres_conocidos: Iterable[str] = ()):
        self._conocidos = [n for n in nombres_conocidos if n and n.strip()]

    def seudonimizar(self, texto: str) -> tuple[str, dict[str, str]]:
        mapa: dict[str, str] = {}           # token -> valor real
        inverso: dict[str, str] = {}        # valor real -> token (mismo valor, mismo token)
        contadores: dict[str, int] = {}

        def token_de(tag: str, valor: str) -> str:
            valor = valor.strip()
            if valor in inverso:
                return inverso[valor]
            contadores[tag] = contadores.get(tag, 0) + 1
            tok = f"[{tag}_{contadores[tag]}]"
            mapa[tok] = valor
            inverso[valor] = tok
            return tok

        for nombre in self._conocidos:
            texto = re.sub(re.escape(nombre), lambda m: token_de("PACIENTE", m.group(0)), texto, flags=re.I)

        for tag, patron, grupo in _PATRONES:
            def reemplazo(m: re.Match, tag=tag, grupo=grupo) -> str:
                valor = m.group(grupo)
                if valor.startswith("[") and valor.endswith("]"):   # ya es un token
                    return m.group(0)
                tok = token_de(tag, valor)
                if grupo == 0:
                    return tok
                ini, fin = m.span(grupo)
                base = m.start()
                return m.group(0)[: ini - base] + tok + m.group(0)[fin - base:]
            texto = patron.sub(reemplazo, texto)

        # Un nombre hallado por etiqueta puede reaparecer sin ella: se reemplaza en todo el texto.
        for tok, real in sorted(mapa.items(), key=lambda kv: -len(kv[1])):
            if tok.startswith(("[PACIENTE_", "[PROF_")):
                texto = re.sub(re.escape(real), tok, texto, flags=re.I)
        return texto, mapa

    @staticmethod
    def reidentificar(valor: Optional[str], mapa: dict[str, str]) -> Optional[str]:
        if valor is None:
            return None
        for _ in range(4):                       # tokens anidados: "Dra. [PROF_1]" dentro de [PROF_2]
            previo = valor
            for tok, real in mapa.items():
                valor = valor.replace(tok, real)
            if valor == previo:
                break
        return valor
