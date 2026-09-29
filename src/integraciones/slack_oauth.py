"""Integración con Slack por OAuth (instalación en el workspace, no un webhook fijo).

Dos piezas separadas a propósito:

  * `crear_app_slack()` monta el flujo de instalación ("Add to Slack" -> autorizar ->
    Slack guarda el token del bot). Esto se expone como rutas HTTP; hace falta un
    servidor (ver `api.py`) porque Slack redirige el navegador del usuario a estas URLs.
  * `NotificadorSlack` implementa el puerto `Notificador` (puertos.py) usando el token
    que la instalación dejó guardado. El grafo (`nodos.py`) nunca ve slack_bolt ni
    slack_sdk: solo llama a `.enviar(canal, alerta)`.

Variables de entorno esperadas (ninguna se hardcodea aquí):
    SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET
    SLACK_REDIRECT_URI   -> debe coincidir con la que se registra en api.slack.com
    MEDIFLOW_SLACK_TEAM_ID -> el team_id del workspace ya instalado (para el envío)

Instalación real, paso a paso:
    1. Crear la app en https://api.slack.com/apps, con OAuth scopes de bot:
       chat:write, channels:read (y channels:join si va a publicar en canales
       públicos a los que el bot todavía no se unió).
    2. Configurar la Redirect URL de OAuth como {tu_dominio}/slack/oauth_redirect.
    3. Levantar `api.py` (o montar `slack_routes(app)` en tu FastAPI existente) y
       visitar GET /slack/install: eso lleva al diálogo de autorización de Slack.
    4. Slack redirige a /slack/oauth_redirect con un `code`; slack_bolt lo cambia
       por el token y lo guarda en el InstallationStore (aquí, en disco).
    5. A partir de ahí, `NotificadorSlack` ya puede publicar sin volver a pedir permiso.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from slack_bolt import App
from slack_bolt.adapter.fastapi import SlackRequestHandler
from slack_bolt.oauth.oauth_settings import OAuthSettings
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from slack_sdk.oauth.installation_store import FileInstallationStore, InstallationStore
from slack_sdk.oauth.state_store import FileOAuthStateStore

SCOPES_BOT = ("chat:write", "channels:read", "groups:read")


def crear_app_slack(
    *,
    client_id: str,
    client_secret: str,
    signing_secret: str,
    redirect_uri: str,
    installation_store: InstallationStore | None = None,
    scopes: tuple[str, ...] = SCOPES_BOT,
) -> tuple[App, InstallationStore]:
    """Arma la App de Bolt con el flujo OAuth ya configurado.

    `installation_store` es donde queda el token tras la autorización. El valor por
    defecto (archivo en disco) sirve para una demo o una sola instalación; en
    producción con más de un workspace conviene una implementación en base de datos
    (mismo `Protocol` de slack_sdk, solo cambia el `__init__`)."""
    store = installation_store or FileInstallationStore(base_dir=os.getenv(
        "MEDIFLOW_SLACK_INSTALL_DIR", "./.slack_installations"))
    oauth_settings = OAuthSettings(
        client_id=client_id,
        client_secret=client_secret,
        scopes=list(scopes),
        redirect_uri=redirect_uri,
        install_path="/slack/install",
        redirect_uri_path="/slack/oauth_redirect",
        installation_store=store,
        state_store=FileOAuthStateStore(
            expiration_seconds=600,
            base_dir=os.getenv("MEDIFLOW_SLACK_STATE_DIR", "./.slack_oauth_state")),
    )
    app = App(signing_secret=signing_secret, oauth_settings=oauth_settings)
    return app, store


def crear_app_slack_desde_entorno() -> tuple[App, InstallationStore]:
    """Igual que `crear_app_slack` pero leyendo las 4 variables de entorno de arriba.
    Lanza KeyError con un mensaje claro si falta alguna (mejor eso que un fallo de
    Slack a medio flujo de autorización)."""
    def _env(nombre: str) -> str:
        valor = os.getenv(nombre)
        if not valor:
            raise KeyError(f"falta la variable de entorno {nombre} para configurar Slack OAuth")
        return valor
    return crear_app_slack(
        client_id=_env("SLACK_CLIENT_ID"),
        client_secret=_env("SLACK_CLIENT_SECRET"),
        signing_secret=_env("SLACK_SIGNING_SECRET"),
        redirect_uri=_env("SLACK_REDIRECT_URI"),
    )


def slack_request_handler(app: App) -> SlackRequestHandler:
    """El puente entre las rutas FastAPI (`api.py`) y el flujo OAuth de Bolt.
    Ver `api.py` para cómo se monta en GET /slack/install y /slack/oauth_redirect."""
    return SlackRequestHandler(app)


@dataclass
class NotificadorSlack:
    """Implementa el puerto `Notificador` (puertos.py) publicando en Slack.

    `canales_por_destino` traduce los roles abstractos de `Config`
    (`destinatario_critico`, `destinatario_revision_humana`, etc.) al canal real de
    Slack. Un rol sin entrada cae en `canales_por_destino["default"]` si existe, o
    lanza `ConnectionError` (lo que RN-P7 interpreta como "este canal falló, probar
    el siguiente de `canales_alerta`")."""

    installation_store: InstallationStore
    team_id: str
    canales_por_destino: dict[str, str] = field(default_factory=dict)

    def _token_bot(self) -> str:
        inst = self.installation_store.find_installation(enterprise_id=None, team_id=self.team_id)
        if inst is None or not inst.bot_token:
            raise ConnectionError(
                f"Slack no está instalado para el team {self.team_id!r} (falta autorizar en /slack/install)")
        return inst.bot_token

    def _canal_destino(self, alerta: dict) -> str:
        clave = alerta.get("destinatario") or alerta.get("tipo") or "default"
        canal = self.canales_por_destino.get(clave) or self.canales_por_destino.get("default")
        if not canal:
            raise ConnectionError(f"no hay canal de Slack configurado para {clave!r}")
        return canal

    @staticmethod
    def _texto(alerta: dict) -> str:
        # RN-M4 / RN-Q4: nunca datos del paciente. Solo IDs, tipo/nivel, motivos (códigos
        # de regla) y el enlace al documento -- nunca texto clínico ni identificadores.
        nivel = alerta.get("nivel")
        tipo = alerta.get("tipo", "alerta")
        partes = [f"*MediFlow* · {tipo}" + (f" ({nivel})" if nivel else "")]
        partes.append(f"Documento: `{alerta.get('documento_id')}`")
        if alerta.get("etapa"):
            partes.append(f"Etapa: `{alerta['etapa']}`  Error: `{alerta.get('error')}`")
        if alerta.get("motivos"):
            partes.append("Motivos: " + ", ".join(alerta["motivos"]))
        if alerta.get("enlace"):
            partes.append(f"<{alerta['enlace']}|Abrir en MediFlow>")
        return "\n".join(partes)

    def enviar(self, canal: str, alerta: dict) -> None:
        """`canal` aquí es el *transporte* (RN-P7: "slack", "email", ...), no el canal
        de Slack. Si `canal != "slack"` esta clase no sabe manejarlo: el llamador
        (nodos.py) lo interpreta como fallo y prueba el siguiente transporte."""
        if canal != "slack":
            raise NotImplementedError(f"NotificadorSlack no maneja el transporte {canal!r}")
        destino = self._canal_destino(alerta)
        cliente = WebClient(token=self._token_bot())
        try:
            cliente.chat_postMessage(channel=destino, text=self._texto(alerta))
        except SlackApiError as exc:
            raise ConnectionError(f"Slack respondió con error: {exc.response.get('error')}") from exc
