"""Puertos: las 3 fronteras del agente con el mundo exterior.

El grafo solo conoce estas interfaces. Conectar OCI Object Storage, Slack/correo y los
sistemas destino es implementar una clase con estos métodos; no se toca el grafo.
Aquí van también las implementaciones en memoria que usan los tests y la demo.
"""
from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class Almacen(Protocol):
    def guardar(self, ruta: str, contenido: Any) -> None:
        """Guarda original o JSON de resultado (RN-G1). Debe lanzar excepción si falla."""


@runtime_checkable
class Notificador(Protocol):
    def enviar(self, canal: str, alerta: dict) -> None:
        """Envía por un canal (Slack, correo, SMS). Lanza excepción si el canal está caído (RN-P7).
        `alerta` solo lleva documento_id, nivel y enlace (RN-Q4)."""


@runtime_checkable
class Despachador(Protocol):
    def entregar(self, destino: str, payload: dict) -> bool:
        """Entrega a un destino de RN-E1. True = el destino confirmó."""


class AlmacenMemoria:
    def __init__(self, fallar: bool = False):
        self.objetos: dict[str, Any] = {}
        self.fallar = fallar

    def guardar(self, ruta: str, contenido: Any) -> None:
        if self.fallar:
            raise ConnectionError("almacenamiento caído")
        self.objetos[ruta] = contenido

    def rutas(self, contiene: str = "") -> list[str]:
        return [r for r in self.objetos if contiene in r]


class NotificadorMemoria:
    def __init__(self, canales_caidos: set[str] | None = None):
        self.enviados: list[tuple[str, dict]] = []
        self.canales_caidos = canales_caidos or set()

    def enviar(self, canal: str, alerta: dict) -> None:
        if canal in self.canales_caidos:
            raise ConnectionError(f"canal {canal} caído")
        self.enviados.append((canal, dict(alerta)))


class DespachadorMemoria:
    def __init__(self, caidos: set[str] | None = None):
        self.entregas: list[tuple[str, dict]] = []
        self.caidos = caidos or set()

    def entregar(self, destino: str, payload: dict) -> bool:
        if destino in self.caidos:
            return False
        self.entregas.append((destino, payload))
        return True


class NotificadorCompuesto:
    """Enruta por transporte (RN-P7): {"slack": NotificadorSlack, "email": NotificadorEmail, ...}.
    Un transporte sin adaptador cuenta como caído y el llamador prueba el siguiente."""

    def __init__(self, por_transporte: dict[str, Notificador]):
        self.por_transporte = por_transporte

    def enviar(self, canal: str, alerta: dict) -> None:
        adaptador = self.por_transporte.get(canal)
        if adaptador is None:
            raise ConnectionError(f"transporte {canal!r} no configurado")
        adaptador.enviar(canal, alerta)
