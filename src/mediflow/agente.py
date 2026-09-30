"""Fachada del agente: lo que usa la capa de automatización (n8n, API, cola, cron).

    agente = AgenteMediFlow(deps)
    r = agente.procesar(request)                  # procesa o devuelve el resultado previo (RN-O1)
    agente.resolver(doc_id, decision)             # un humano resuelve un documento en revisión
    agente.registrar_acuse(doc_id, "dra.perez")   # acuse de una alerta crítica
    agente.alertas_vencidas(ahora)                # para el cron de escalamiento (RN-F2)
"""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta
from typing import Any, Optional

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from .grafo import construir_grafo
from .modelos import Prioridad
from .nodos import Dependencias, armar_resultado
from .revision import DecisionHumana, DecisionInvalida, USUARIOS_NO_HUMANOS, validar_decision


class EstadoIncorrecto(RuntimeError):
    """La operación no aplica al estado actual del documento."""


def _hash(contenido: Any) -> str:
    b = contenido if isinstance(contenido, bytes) else str(contenido).encode()
    return hashlib.sha256(b).hexdigest()


class AgenteMediFlow:
    def __init__(self, deps: Dependencias, checkpointer: Optional[BaseCheckpointSaver] = None):
        self.deps = deps
        self.grafo = construir_grafo(deps, checkpointer or InMemorySaver())
        # Índices de idempotencia. En producción: base de datos (aquí, memoria de proceso).
        self._docs: dict[str, dict] = {}          # documento_id -> {version, hash, thread}
        self._por_hash: dict[str, str] = {}       # hash -> primer documento_id (RN-O3)

    # ---------------------------------------------------------------- utilidades
    @staticmethod
    def _cfg(thread: str) -> dict:
        return {"configurable": {"thread_id": thread}}

    def _thread(self, documento_id: str) -> str:
        if documento_id not in self._docs:
            raise KeyError(f"documento desconocido: {documento_id}")
        return self._docs[documento_id]["thread"]

    def _pendiente(self, snap) -> Optional[dict]:
        for tarea in snap.tasks:
            for it in tarea.interrupts:
                return it.value
        return None

    def _salida(self, thread: str) -> dict:
        snap = self.grafo.get_state(self._cfg(thread))
        v = snap.values
        pendiente = self._pendiente(snap)
        return {
            "documento_id": v.get("documento_id"),
            "version": v.get("version"),
            "estado": v.get("estado"),
            "pendiente": pendiente,     # None | {"tipo": "revision_humana" | "acuse", ...}
            "resultado": v.get("resultado") or armar_resultado(v, self.deps.config),
        }

    # ---------------------------------------------------------------- API
    def procesar(self, request: dict) -> dict:
        docid = str(request.get("documento_id") or "")
        h = _hash(request.get("contenido", ""))
        previo = self._docs.get(docid) if docid else None

        if previo and previo["hash"] == h:                       # RN-O1: mismo id, mismo contenido
            return self._salida(previo["thread"])

        version = previo["version"] + 1 if previo else 1          # RN-O2: contenido nuevo = versión nueva
        duplicado_de = None
        if not previo and h in self._por_hash and self._por_hash[h] != docid:
            duplicado_de = self._por_hash[h]                      # RN-O3: mismo contenido, otro id

        thread = f"{docid or 'sin_id'}:v{version}"
        if docid:
            self._docs[docid] = {"version": version, "hash": h, "thread": thread}
            if not duplicado_de:
                self._por_hash.setdefault(h, docid)
        self.grafo.invoke(
            {"request": request, "version": version, "posible_duplicado_de": duplicado_de,
             "clave_alerta": duplicado_de or docid},
            self._cfg(thread))
        return self._salida(thread)

    def estado(self, documento_id: str) -> dict:
        return self._salida(self._thread(documento_id))

    def resolver(self, documento_id: str, decision: dict | DecisionHumana) -> dict:
        """Reanuda un documento en EN_REVISION_HUMANA con la decisión de un revisor.
        Valida ANTES de reanudar (RN-J3, J5, K5): una decisión inválida no altera el documento."""
        thread = self._thread(documento_id)
        snap = self.grafo.get_state(self._cfg(thread))
        pend = self._pendiente(snap)
        if not pend or pend.get("tipo") != "revision_humana":
            raise EstadoIncorrecto(f"{documento_id} no está esperando revisión humana")
        d = decision if isinstance(decision, DecisionHumana) else DecisionHumana.model_validate(decision)
        validar_decision(d, prioridad_actual=Prioridad(snap.values.get("prioridad") or "Rutina"),
                         tiene_clasificacion=bool(snap.values.get("clasificacion")))
        self.grafo.invoke(Command(resume=d.model_dump(mode="json")), self._cfg(thread))
        return self._salida(thread)

    def registrar_acuse(self, documento_id: str, usuario: str) -> dict:
        thread = self._thread(documento_id)
        pend = self._pendiente(self.grafo.get_state(self._cfg(thread)))
        if not pend or pend.get("tipo") != "acuse":
            raise EstadoIncorrecto(f"{documento_id} no espera acuse")
        if usuario.strip().lower() in USUARIOS_NO_HUMANOS or usuario.lower().startswith("svc"):
            raise DecisionInvalida("RN-Q5: el acuse lo da un usuario identificado")
        self.grafo.invoke(Command(resume={"usuario": usuario}), self._cfg(thread))
        return self._salida(thread)

    def alertas_vencidas(self, ahora: Optional[datetime] = None) -> list[dict]:
        """Alertas críticas sin acuse tras `minutos_escalamiento` (RN-F2). El cron o n8n
        llama a esto y ejecuta el escalamiento al siguiente nivel de la cadena."""
        ahora = ahora or datetime.fromisoformat(self.deps.reloj())
        limite = timedelta(minutes=self.deps.config.minutos_escalamiento)
        vencidas = []
        for docid, info in self._docs.items():
            alerta = self.grafo.get_state(self._cfg(info["thread"])).values.get("alerta")
            if alerta and alerta.get("nivel") == "Crítico" and alerta.get("estado_acuse") == "pendiente":
                if alerta.get("estado_envio") == "fallida":          # nunca salió por ningún canal: no esperar
                    vencidas.append({"documento_id": docid, "alerta": alerta, "motivo": "envio_fallido"})
                elif ahora - datetime.fromisoformat(alerta["fecha_hora"]) >= limite:
                    vencidas.append({"documento_id": docid, "alerta": alerta, "motivo": "sin_acuse"})
        return vencidas
