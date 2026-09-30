"""Revisión humana: modelo de la decisión, validación (RN-J3, J5, K) y aplicación de correcciones (J8)."""
from __future__ import annotations

import re
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from .modelos import Prioridad

ROLES_REVISORES = {"auditor_clinico", "farmaceutico", "auditor_autorizaciones", "jefe_guardia"}
ROLES_CLINICOS_BAJAN = {"auditor_clinico"}          # RN-J5 / tabla K: bajar prioridad con justificación
USUARIOS_NO_HUMANOS = {"", "sistema", "auto", "bot", "servicio", "service"}   # RN-K5, RN-Q5


class DecisionInvalida(ValueError):
    pass


class DecisionHumana(BaseModel):
    usuario: str
    rol: str
    accion: Literal["aprobar", "corregir", "rechazar"]
    motivo: Optional[str] = None                     # obligatorio al rechazar (RN-J3)
    correcciones: dict[str, Any] = Field(default_factory=dict)
    prioridad_nueva: Optional[Prioridad] = None
    justificacion: Optional[str] = None


def validar_decision(d: DecisionHumana, *, prioridad_actual: Prioridad, tiene_clasificacion: bool) -> None:
    if d.usuario.strip().lower() in USUARIOS_NO_HUMANOS or d.usuario.lower().startswith("svc"):
        raise DecisionInvalida("RN-K5: la decisión debe darla un usuario identificado, no una cuenta de servicio")
    if d.rol not in ROLES_REVISORES:
        raise DecisionInvalida(f"RN-K2: el rol {d.rol!r} no puede resolver documentos")
    if d.accion == "rechazar" and not (d.motivo and d.motivo.strip()):
        raise DecisionInvalida("RN-J3: rechazar exige motivo")
    if d.accion == "corregir" and not d.correcciones:
        raise DecisionInvalida("corregir exige al menos una corrección")
    if d.prioridad_nueva and d.prioridad_nueva.rango < prioridad_actual.rango:      # RN-J5
        if d.rol not in ROLES_CLINICOS_BAJAN or not (d.justificacion and d.justificacion.strip()):
            raise DecisionInvalida("RN-J5: bajar prioridad exige rol clínico y justificación escrita")
    if d.accion != "rechazar" and not tiene_clasificacion and "tipo_documento" not in d.correcciones:
        raise DecisionInvalida("el documento no tiene clasificación: indica 'tipo_documento' en las correcciones")


def _partes(ruta: str) -> list[str | int]:
    return [int(p) if p.isdigit() else p for p in re.findall(r"[^.\[\]]+", ruta)]


def aplicar_correcciones(datos: dict, correcciones: dict[str, Any]) -> tuple[dict, list[dict]]:
    """Aplica correcciones por ruta ("diagnostico_codigo", "medicamentos[0].dosis",
    "signos_vitales.spo2") sobre el dict de la extracción. Devuelve (nuevo, pares) donde
    `pares` son los registros extraído→corregido de RN-J8."""
    import copy
    nuevo, pares = copy.deepcopy(datos), []
    for ruta, valor in correcciones.items():
        partes = _partes(ruta)
        nodo: Any = nuevo
        for p in partes[:-1]:
            nodo = nodo[p]
        ultimo = partes[-1]
        actual = nodo[ultimo]
        if isinstance(actual, dict) and "valor" in actual:       # es un Campo
            pares.append({"campo": ruta, "extraido": actual["valor"], "corregido": str(valor)})
            actual["valor"], actual["confianza"] = str(valor), 1.0
        else:
            pares.append({"campo": ruta, "extraido": actual, "corregido": valor})
            nodo[ultimo] = valor
    return nuevo, pares
