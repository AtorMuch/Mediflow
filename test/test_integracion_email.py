"""Canal alterno de correo y enrutamiento por transporte, sin red (SMTP falso)."""
import pytest

from mediflow.integraciones.email_smtp import NotificadorEmail
from mediflow.puertos import NotificadorCompuesto, NotificadorMemoria


class SmtpFalso:
    enviados: list = []
    falla = False

    def __init__(self, host, puerto, timeout=None):
        if SmtpFalso.falla:
            raise OSError("sin red")

    def __enter__(self): return self
    def __exit__(self, *a): return False
    def starttls(self): pass
    def login(self, u, c): pass
    def send_message(self, msg): SmtpFalso.enviados.append(msg)


def _n():
    SmtpFalso.enviados, SmtpFalso.falla = [], False
    return NotificadorEmail(host="smtp.x", remitente="mediflow@clinica.co", usuario="u", clave="c",
                            destinos={"jefe_de_guardia": "guardia@clinica.co"}, smtp_factory=SmtpFalso)


ALERTA = {"documento_id": "DOC-1", "tipo": "alerta_clinica", "nivel": "Crítico",
          "destinatario": "jefe_de_guardia", "enlace": "https://mediflow.local/documentos/DOC-1"}


def test_correo_llega_al_destinatario_y_sin_datos_del_paciente():
    n = _n()
    n.enviar("email", {**ALERTA, "paciente_nombre": "Juan Pérez", "extraccion": {"x": 1}})
    msg = SmtpFalso.enviados[0]
    assert msg["To"] == "guardia@clinica.co" and "DOC-1" in msg.get_content()
    assert "Juan" not in msg.get_content() and "Pérez" not in msg.get_content()


def test_fallos_de_smtp_o_destino_faltante_son_connection_error():
    n = _n()
    SmtpFalso.falla = True
    with pytest.raises(ConnectionError):
        n.enviar("email", ALERTA)
    with pytest.raises(ConnectionError):
        _n().enviar("email", {**ALERTA, "destinatario": "otro_rol"})
    with pytest.raises(NotImplementedError):
        _n().enviar("slack", ALERTA)


def test_compuesto_enruta_por_transporte_y_un_transporte_ausente_cuenta_como_caido():
    slack, correo = NotificadorMemoria(), NotificadorMemoria()
    comp = NotificadorCompuesto({"slack": slack, "email": correo})
    comp.enviar("email", ALERTA)
    assert correo.enviados and not slack.enviados
    with pytest.raises(ConnectionError):
        NotificadorCompuesto({"slack": slack}).enviar("email", ALERTA)
