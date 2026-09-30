"""Servidor mínimo. Dos motivos para que exista:

  1. El OAuth de Slack necesita una URL real donde Slack redirige el navegador
     (GET /slack/install y GET /slack/oauth_redirect) -- eso no puede vivir solo
     como una librería de Python.
  2. Exponer `AgenteMediFlow` por HTTP para que otros servicios (n8n, el frontend,
     una cola) puedan llamarlo sin importar el paquete `mediflow` directamente.

Ejecutar:
    pip install fastapi "uvicorn[standard]" slack-bolt slack-sdk
    export SLACK_CLIENT_ID=... SLACK_CLIENT_SECRET=... SLACK_SIGNING_SECRET=... SLACK_REDIRECT_URI=...
    export MEDIFLOW_SLACK_TEAM_ID=...          # una vez que ya instalaste el bot una vez
    uvicorn mediflow.api:app --reload

Si las variables de Slack no están seteadas, el servidor igual levanta: /slack/*
devuelve 503 y las notificaciones simplemente fallan ese transporte (RN-P7 pasa
al siguiente canal configurado, p. ej. email).
"""
from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import Response

from .agente import AgenteMediFlow, EstadoIncorrecto
from .config import Config
from .llm import crear_cadenas_openai
from .nodos import Dependencias
from .integraciones.email_smtp import NotificadorEmail
from .puertos import AlmacenMemoria, DespachadorMemoria, NotificadorCompuesto, NotificadorMemoria
from .revision import ROLES_REVISORES, DecisionInvalida
from .seguridad import ROL_INTEGRACION, ROLES_LECTURA, Autenticador, Usuario, requerir

log = logging.getLogger("mediflow.api")
app = FastAPI(title="MediFlow", version="0.1.0")
_auth = Autenticador.desde_entorno()

# ---------------------------------------------------------------------------------- Slack OAuth
_slack_handler = None
try:
    from .integraciones.slack_oauth import NotificadorSlack, crear_app_slack_desde_entorno, slack_request_handler

    _slack_app, _slack_store = crear_app_slack_desde_entorno()
    _slack_handler = slack_request_handler(_slack_app)
    log.info("Slack OAuth configurado (instalar en GET /slack/install)")
except KeyError as exc:
    log.warning("Slack OAuth deshabilitado: %s", exc)
except ImportError:
    log.warning("slack-bolt / slack-sdk no están instalados: pip install slack-bolt slack-sdk")


@app.get("/slack/install")
async def slack_install(request: Request) -> Response:
    if _slack_handler is None:
        raise HTTPException(503, "Slack OAuth no está configurado en este servidor")
    return await _slack_handler.handle(request)


@app.get("/slack/oauth_redirect")
async def slack_oauth_redirect(request: Request) -> Response:
    if _slack_handler is None:
        raise HTTPException(503, "Slack OAuth no está configurado en este servidor")
    return await _slack_handler.handle(request)


# ---------------------------------------------------------------------------------- Agente
def _construir_notificador():
    """Arma el notificador con los transportes disponibles (RN-P7: Slack primero, correo como alterno).
    Sin ninguno configurado, un stub en memoria (el servidor arranca igual en demo)."""
    transportes: dict = {}
    team_id = os.getenv("MEDIFLOW_SLACK_TEAM_ID")
    if _slack_handler is not None and team_id:
        canales = {
            "jefe_de_guardia": os.getenv("SLACK_CANAL_CRITICO", "#urgencias-criticas"),
            "profesional_solicitante": os.getenv("SLACK_CANAL_URGENTE", "#mediflow-avisos"),
            "equipo_revision_humana": os.getenv("SLACK_CANAL_REVISION", "#mediflow-revision"),
            "equipo_ingenieria": os.getenv("SLACK_CANAL_OPS", "#mediflow-ops"),
        }
        transportes["slack"] = NotificadorSlack(installation_store=_slack_store, team_id=team_id,
                                                canales_por_destino=canales)
    correo = NotificadorEmail.desde_entorno()
    if correo is not None:
        transportes["email"] = correo
    if transportes:
        return NotificadorCompuesto(transportes)
    log.warning("usando NotificadorMemoria (sin Slack ni correo): las alertas NO salen del proceso")
    return NotificadorMemoria()


def _construir_dependencias() -> Dependencias:
    modo_demo = os.getenv("MEDIFLOW_LLM", "demo") == "demo"
    if modo_demo:
        from langchain_core.runnables import RunnableLambda

        from .modelos import Clasificacion, Dominio, Extraccion, Setting, TipoDocumento
        from .llm import Cadenas

        log.warning("MEDIFLOW_LLM=demo: usando un clasificador/extractor de relleno, NO un LLM real. "
                    "Define MEDIFLOW_LLM=openai y OPENAI_API_KEY para producción.")
        relleno_clas = Clasificacion(tipo=TipoDocumento.NO_CLASIFICABLE, dominio=Dominio.OTRO,
                                     setting=Setting.AMBULATORIO, confianza=0.0)
        cadenas = Cadenas(clasificador=RunnableLambda(lambda x: relleno_clas),
                          extractor=RunnableLambda(lambda x: Extraccion()))
    else:
        cadenas = crear_cadenas_openai()
    return Dependencias(cadenas=cadenas, almacen=AlmacenMemoria(), notificador=_construir_notificador(),
                        despachador=DespachadorMemoria(), config=Config())


_deps = _construir_dependencias()
agente = AgenteMediFlow(_deps)


@app.post("/documentos")
def ingresar_documento(request: dict, _u: Optional[Usuario] = Depends(requerir(_auth, *ROLES_LECTURA))) -> dict:
    """RN-A: recibe un documento. `request` sigue el contrato de `request()` en los
    tests (documento_id, contenido, formato, canal_origen; pais_origen, si viene, debe ser CO)."""
    return agente.procesar(request)


@app.get("/documentos/{documento_id}")
def estado_documento(documento_id: str, _u: Optional[Usuario] = Depends(requerir(_auth, *ROLES_LECTURA))) -> dict:
    try:
        return agente.estado(documento_id)
    except KeyError:
        raise HTTPException(404, f"documento desconocido: {documento_id}")


@app.post("/documentos/{documento_id}/resolver")
def resolver_documento(documento_id: str, decision: dict,
                       u: Optional[Usuario] = Depends(requerir(_auth, *ROLES_REVISORES))) -> dict:
    if u is not None:                      # la identidad sale del token, no del body
        decision = {**decision, "usuario": u.usuario, "rol": u.rol}
    try:
        return agente.resolver(documento_id, decision)
    except KeyError:
        raise HTTPException(404, f"documento desconocido: {documento_id}")
    except (EstadoIncorrecto, DecisionInvalida) as exc:
        raise HTTPException(409, str(exc))


@app.post("/documentos/{documento_id}/acuse")
def registrar_acuse(documento_id: str, usuario: dict,
                    u: Optional[Usuario] = Depends(requerir(_auth, *ROLES_REVISORES))) -> dict:
    nombre = u.usuario if u is not None else usuario.get("usuario", "")
    try:
        return agente.registrar_acuse(documento_id, nombre)
    except KeyError:
        raise HTTPException(404, f"documento desconocido: {documento_id}")
    except (EstadoIncorrecto, DecisionInvalida) as exc:
        raise HTTPException(409, str(exc))


@app.get("/alertas/vencidas")
def alertas_vencidas(_u: Optional[Usuario] = Depends(requerir(_auth, ROL_INTEGRACION, "jefe_guardia"))) -> list[dict]:
    """Para el cron de escalamiento RN-F2 (n8n, un scheduler, lo que sea)."""
    return agente.alertas_vencidas()
