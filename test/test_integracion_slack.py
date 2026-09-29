"""NotificadorSlack: enrutamiento de canal y manejo de errores, sin tocar la red.
No prueba el flujo OAuth en sí (eso requiere credenciales reales de Slack; ver
GUIA_PRUEBAS.md para cómo probarlo manualmente contra un workspace de prueba)."""
import pytest

pytest.importorskip("slack_sdk")

from slack_sdk.errors import SlackApiError
from slack_sdk.oauth.installation_store.models.installation import Installation

from mediflow.integraciones.slack_oauth import NotificadorSlack


class _StoreFalso:
    """Reemplaza a FileInstallationStore: no toca disco ni red."""
    def __init__(self, instalado: bool = True, token: str = "xoxb-falso"):
        self._inst = Installation(team_id="T1", user_id="U0", bot_token=token) if instalado else None

    def find_installation(self, *, enterprise_id, team_id, **_):
        return self._inst if team_id == "T1" else None


class _WebClientFalso:
    """Reemplaza a slack_sdk.WebClient.chat_postMessage."""
    llamadas: list[dict] = []
    fallar_con: str | None = None

    def __init__(self, token):
        self.token = token

    def chat_postMessage(self, *, channel, text):
        type(self).llamadas.append({"channel": channel, "text": text, "token": self.token})
        if type(self).fallar_con:
            raise SlackApiError("error de la API", response={"error": type(self).fallar_con})


@pytest.fixture(autouse=True)
def _parchar_webclient(monkeypatch):
    _WebClientFalso.llamadas = []
    _WebClientFalso.fallar_con = None
    monkeypatch.setattr("mediflow.integraciones.slack_oauth.WebClient", _WebClientFalso)
    yield


def _notificador(**canales):
    return NotificadorSlack(installation_store=_StoreFalso(), team_id="T1",
                            canales_por_destino=canales or {"jefe_de_guardia": "#urgencias-criticas"})


def test_enruta_por_destinatario_al_canal_configurado():
    n = _notificador(jefe_de_guardia="#urgencias-criticas")
    n.enviar("slack", {"documento_id": "DOC-1", "tipo": "alerta_clinica", "nivel": "Crítico",
                       "destinatario": "jefe_de_guardia", "enlace": "https://x/DOC-1"})
    (llamada,) = _WebClientFalso.llamadas
    assert llamada["channel"] == "#urgencias-criticas"
    assert "DOC-1" in llamada["text"] and "Crítico" in llamada["text"]


def test_usa_tipo_como_clave_si_no_hay_destinatario():
    n = _notificador(fallo_tecnico="#mediflow-ops")
    n.enviar("slack", {"documento_id": "DOC-2", "tipo": "fallo_tecnico", "etapa": "CLASIFICADO",
                       "error": "TimeoutError", "enlace": "https://x/DOC-2"})
    assert _WebClientFalso.llamadas[0]["channel"] == "#mediflow-ops"


def test_nunca_incluye_datos_del_paciente_en_el_texto():
    n = _notificador(equipo_revision_humana="#mediflow-revision")
    n.enviar("slack", {"documento_id": "DOC-3", "tipo": "revision_humana",
                       "destinatario": "equipo_revision_humana", "motivos": ["confianza_baja"],
                       "enlace": "https://x/DOC-3"})
    texto = _WebClientFalso.llamadas[0]["text"]
    assert "DOC-3" in texto and "confianza_baja" in texto
    assert "paciente" not in texto.lower()


def test_transporte_distinto_de_slack_lanza_notimplementederror():
    with pytest.raises(NotImplementedError):
        _notificador().enviar("email", {"documento_id": "DOC-4", "tipo": "alerta_clinica"})


def test_sin_instalacion_oauth_lanza_connectionerror_para_que_rn_p7_reintente_otro_canal():
    n = NotificadorSlack(installation_store=_StoreFalso(instalado=False), team_id="T1",
                         canales_por_destino={"jefe_de_guardia": "#x"})
    with pytest.raises(ConnectionError, match="no está instalado"):
        n.enviar("slack", {"documento_id": "DOC-5", "destinatario": "jefe_de_guardia"})


def test_sin_canal_configurado_para_el_destinatario_lanza_connectionerror():
    n = _notificador(jefe_de_guardia="#urgencias-criticas")
    with pytest.raises(ConnectionError, match="no hay canal"):
        n.enviar("slack", {"documento_id": "DOC-6", "destinatario": "rol_no_mapeado"})


def test_error_de_la_api_de_slack_se_traduce_a_connectionerror():
    _WebClientFalso.fallar_con = "channel_not_found"
    n = _notificador(jefe_de_guardia="#urgencias-criticas")
    with pytest.raises(ConnectionError, match="channel_not_found"):
        n.enviar("slack", {"documento_id": "DOC-7", "destinatario": "jefe_de_guardia"})
