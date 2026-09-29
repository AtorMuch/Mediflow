"""Ensamblado del StateGraph de LangGraph. Refleja el diagrama 'Flujo autónomo' del documento.

    START → recibir → validar ─┬─ RECHAZADO → END
                               └─ clasificar → extraer → evaluar → alertar ─┬─ enrutar → entregar → [esperar_acuse] → cerrar → END
                                     │            │                          └─ enviar_a_revision → esperar_humano ─┬─ RECHAZADO → END
                                     └────┬───────┘                                                                └─ post_revision → alertar
                                     fallo_tecnico ─ reintento → (etapa que falló)
                                                   └ agotado  → alertar → enviar_a_revision
"""
from __future__ import annotations

from typing import Optional

from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from .nodos import Dependencias, EstadoDoc, Nodos


def _tras_validar(s: dict) -> str:
    return END if s["estado"] == "RECHAZADO" else "clasificar"


def _tras_llm(siguiente: str):
    def router(s: dict) -> str:
        return "fallo_tecnico" if s["estado"] == "FALLO_TECNICO" else siguiente
    return router


def _tras_fallo(s: dict) -> str:
    if (s.get("fallo") or {}).get("agotado"):
        return "alertar"                          # RN-P4: alerta sin LLM y luego revisión humana
    return {"VALIDADO": "clasificar", "CLASIFICADO": "extraer", "EXTRAIDO": "evaluar"}[s["estado"]]


def _tras_alerta(s: dict) -> str:
    return "enviar_a_revision" if s.get("motivos_revision") else "enrutar"      # RN-E8


def _tras_humano(s: dict) -> str:
    return END if s["estado"] == "RECHAZADO" else "post_revision"


def _tras_entrega(cfg):
    def router(s: dict) -> str:
        ent = s["entrega"]
        if ent["fallidos"] and ent["intentos"] <= cfg.max_reintentos_entrega:
            return "entregar"
        alerta = s.get("alerta")
        if s.get("prioridad") == "Crítico" and alerta and alerta.get("estado_acuse") != "recibido":
            return "esperar_acuse"                                                # RN-J7
        return "cerrar"
    return router


def construir_grafo(deps: Dependencias, checkpointer: Optional[BaseCheckpointSaver] = None):
    n = Nodos(deps)
    g = StateGraph(EstadoDoc)
    for nombre in ("recibir", "validar", "clasificar", "extraer", "fallo_tecnico", "evaluar", "alertar",
                   "enviar_a_revision", "esperar_humano", "post_revision", "enrutar", "entregar",
                   "esperar_acuse", "cerrar"):
        g.add_node(nombre, getattr(n, nombre))

    g.add_edge(START, "recibir")
    g.add_edge("recibir", "validar")
    g.add_conditional_edges("validar", _tras_validar, {END: END, "clasificar": "clasificar"})
    g.add_conditional_edges("clasificar", _tras_llm("extraer"), {"fallo_tecnico": "fallo_tecnico", "extraer": "extraer"})
    g.add_conditional_edges("extraer", _tras_llm("evaluar"), {"fallo_tecnico": "fallo_tecnico", "evaluar": "evaluar"})
    g.add_conditional_edges("fallo_tecnico", _tras_fallo,
                            {"clasificar": "clasificar", "extraer": "extraer", "evaluar": "evaluar", "alertar": "alertar"})
    g.add_edge("evaluar", "alertar")
    g.add_conditional_edges("alertar", _tras_alerta, {"enviar_a_revision": "enviar_a_revision", "enrutar": "enrutar"})
    g.add_edge("enviar_a_revision", "esperar_humano")
    g.add_conditional_edges("esperar_humano", _tras_humano, {END: END, "post_revision": "post_revision"})
    g.add_edge("post_revision", "alertar")
    g.add_edge("enrutar", "entregar")
    g.add_conditional_edges("entregar", _tras_entrega(deps.config),
                            {"entregar": "entregar", "esperar_acuse": "esperar_acuse", "cerrar": "cerrar"})
    g.add_edge("esperar_acuse", "cerrar")
    g.add_edge("cerrar", END)
    return g.compile(checkpointer=checkpointer or InMemorySaver())
