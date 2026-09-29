"""Ciclo de vida del documento (sección 3 y reglas RN-I).

Toda transición de estado pasa por `Ciclo.ir`, que hace cumplir:
  RN-I1  un solo estado; ENTREGADO y RECHAZADO son finales e inmutables.
  RN-I2  no se llega a ENRUTADO sin haber pasado por EVALUADO.
  RN-I3  cada transición registra fecha y hora, actor y motivo.
  RN-I4  desde EN_REVISION_HUMANA solo mueve un usuario.
  RN-I5  el sistema solo rechaza desde RECIBIDO; un revisor puede rechazar con motivo.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Callable, Optional


class Estado(str, Enum):
    RECIBIDO = "RECIBIDO"
    VALIDADO = "VALIDADO"
    CLASIFICADO = "CLASIFICADO"
    EXTRAIDO = "EXTRAIDO"
    EVALUADO = "EVALUADO"
    EN_REVISION_HUMANA = "EN_REVISION_HUMANA"
    RESUELTO = "RESUELTO"
    ENRUTADO = "ENRUTADO"
    ENTREGADO = "ENTREGADO"
    RECHAZADO = "RECHAZADO"
    FALLO_TECNICO = "FALLO_TECNICO"


E = Estado
FINALES = {E.ENTREGADO, E.RECHAZADO}

# Etapas del pipeline donde puede ocurrir un fallo técnico (banda punteada del diagrama).
ETAPAS_CON_FALLO = {E.VALIDADO, E.CLASIFICADO, E.EXTRAIDO}

TRANSICIONES: dict[Estado, set[Estado]] = {
    E.RECIBIDO: {E.VALIDADO, E.RECHAZADO},
    E.VALIDADO: {E.CLASIFICADO, E.FALLO_TECNICO},
    E.CLASIFICADO: {E.EXTRAIDO, E.FALLO_TECNICO},
    E.EXTRAIDO: {E.EVALUADO, E.FALLO_TECNICO},
    E.EVALUADO: {E.EN_REVISION_HUMANA, E.ENRUTADO},
    E.EN_REVISION_HUMANA: {E.RESUELTO, E.RECHAZADO},        # RECHAZADO: solo un revisor (RN-J3)
    # Tras RESUELTO se re-ejecutan las reglas (RN-J4). Si el documento llegó a revisión por
    # un fallo técnico nunca pasó por EVALUADO, y RN-I2 obliga a evaluarlo antes de enrutar.
    E.RESUELTO: {E.EVALUADO, E.ENRUTADO},
    E.ENRUTADO: {E.ENTREGADO},
    E.ENTREGADO: set(),
    E.RECHAZADO: set(),
    # Reintento: vuelve a la etapa donde falló. Agotados: revisión humana (RN-P2).
    E.FALLO_TECNICO: {E.VALIDADO, E.CLASIFICADO, E.EXTRAIDO, E.EN_REVISION_HUMANA},
}

SISTEMA = "sistema"
USUARIO = "usuario"


class TransicionInvalida(Exception):
    """Violación de una regla RN-I. Es un error de programación: no se reintenta."""


def _ahora() -> str:
    return datetime.now(timezone.utc).isoformat()


class Ciclo:
    """Aplica transiciones sobre el estado del grafo y acumula las entradas de historial.

    Uso dentro de un nodo:
        c = Ciclo(state)
        c.ir(Estado.VALIDADO, SISTEMA, "validación superada")
        return c.update(otro_campo=...)
    """

    def __init__(self, state: dict, reloj: Optional[Callable[[], str]] = None):
        self._reloj = reloj or _ahora
        self.estado: Optional[Estado] = Estado(state["estado"]) if state.get("estado") else None
        self._previos = [h["a"] for h in state.get("historial", [])]
        self.nuevas: list[dict] = []

    def visitados(self) -> set[str]:
        return set(self._previos) | {h["a"] for h in self.nuevas}

    def ir(self, nuevo: Estado, actor: str, motivo: str) -> None:
        if actor not in (SISTEMA, USUARIO):
            raise TransicionInvalida(f"actor inválido: {actor!r}")
        if not motivo or not motivo.strip():
            raise TransicionInvalida("RN-I3: toda transición requiere motivo")

        if self.estado is None:                      # ingreso inicial
            if nuevo is not E.RECIBIDO:
                raise TransicionInvalida("un documento nuevo solo puede iniciar en RECIBIDO")
        else:
            if self.estado in FINALES:               # RN-I1
                raise TransicionInvalida(f"RN-I1: {self.estado.value} es final e inmutable")
            if nuevo not in TRANSICIONES[self.estado]:
                raise TransicionInvalida(f"transición no permitida: {self.estado.value} → {nuevo.value}")
            if self.estado is E.EN_REVISION_HUMANA and actor != USUARIO:   # RN-I4
                raise TransicionInvalida("RN-I4: un documento en revisión humana solo lo mueve un usuario")
            if nuevo is E.RECHAZADO and self.estado is E.RECIBIDO and actor != SISTEMA:
                raise TransicionInvalida("RN-I5: el rechazo desde RECIBIDO lo hace el sistema")
            if nuevo is E.RECHAZADO and self.estado is E.EN_REVISION_HUMANA and actor != USUARIO:
                raise TransicionInvalida("RN-I5: solo un revisor rechaza desde revisión humana")
            if nuevo is E.ENRUTADO and E.EVALUADO.value not in self.visitados():   # RN-I2
                raise TransicionInvalida("RN-I2: no se enruta sin haber pasado por EVALUADO")

        self.nuevas.append({
            "de": self.estado.value if self.estado else None,
            "a": nuevo.value,
            "ts": self._reloj(),
            "actor": actor,
            "motivo": motivo,
        })
        self.estado = nuevo

    def update(self, **extra) -> dict:
        """Diccionario de actualización para LangGraph. `historial` usa reducer de suma."""
        return {"estado": self.estado.value, "historial": self.nuevas, **extra}
