"""Canal alterno de correo (SMTP) para el puerto `Notificador` (RN-P7).

Nunca lleva datos del paciente (RN-M4 / RN-Q4): solo tipo/nivel, ID del documento, motivos
(códigos de regla) y el enlace. Variables de entorno (ver `desde_entorno`):
    MEDIFLOW_SMTP_HOST, MEDIFLOW_SMTP_PORT (587), MEDIFLOW_SMTP_USER, MEDIFLOW_SMTP_PASS, MEDIFLOW_SMTP_FROM
    MEDIFLOW_EMAIL_DESTINOS='{"jefe_de_guardia": "guardia@clinica.co", "equipo_ingenieria": "ops@clinica.co", ...}'
"""
from __future__ import annotations

import json
import os
import smtplib
from dataclasses import dataclass, field
from email.message import EmailMessage
from typing import Callable, Optional


def texto_alerta(alerta: dict) -> str:
    partes = [f"MediFlow · {alerta.get('tipo', 'alerta')}" + (f" ({alerta['nivel']})" if alerta.get("nivel") else "")]
    partes.append(f"Documento: {alerta.get('documento_id')}")
    if alerta.get("etapa"):
        partes.append(f"Etapa: {alerta['etapa']}  Error: {alerta.get('error')}")
    if alerta.get("motivos"):
        partes.append("Motivos: " + ", ".join(alerta["motivos"]))
    if alerta.get("enlace"):
        partes.append(f"Abrir en MediFlow: {alerta['enlace']}")
    return "\n".join(partes)


@dataclass
class NotificadorEmail:
    host: str
    remitente: str
    destinos: dict[str, str] = field(default_factory=dict)      # rol abstracto -> correo
    puerto: int = 587
    usuario: Optional[str] = None
    clave: Optional[str] = None
    smtp_factory: Callable[..., smtplib.SMTP] = smtplib.SMTP     # inyectable en tests

    @classmethod
    def desde_entorno(cls) -> Optional["NotificadorEmail"]:
        host = os.getenv("MEDIFLOW_SMTP_HOST")
        if not host:
            return None
        return cls(host=host, puerto=int(os.getenv("MEDIFLOW_SMTP_PORT", "587")),
                   usuario=os.getenv("MEDIFLOW_SMTP_USER"), clave=os.getenv("MEDIFLOW_SMTP_PASS"),
                   remitente=os.environ["MEDIFLOW_SMTP_FROM"],
                   destinos=json.loads(os.getenv("MEDIFLOW_EMAIL_DESTINOS", "{}")))

    def enviar(self, canal: str, alerta: dict) -> None:
        if canal != "email":
            raise NotImplementedError(f"NotificadorEmail no maneja el transporte {canal!r}")
        clave = alerta.get("destinatario") or "default"
        destino = self.destinos.get(clave) or self.destinos.get("default")
        if not destino:
            raise ConnectionError(f"no hay correo configurado para {clave!r}")
        msg = EmailMessage()
        msg["Subject"] = f"[MediFlow] {alerta.get('tipo', 'alerta')}" + (f" {alerta['nivel']}" if alerta.get("nivel") else "")
        msg["From"], msg["To"] = self.remitente, destino
        msg.set_content(texto_alerta(alerta))
        try:
            with self.smtp_factory(self.host, self.puerto, timeout=15) as smtp:
                smtp.starttls()
                if self.usuario:
                    smtp.login(self.usuario, self.clave or "")
                smtp.send_message(msg)
        except (smtplib.SMTPException, OSError) as exc:
            raise ConnectionError(f"SMTP falló: {type(exc).__name__}") from exc
