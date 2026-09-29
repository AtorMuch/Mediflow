"""Autenticación de la API por token (Bearer) con rol asociado.

El usuario y el rol de quien resuelve o acusa salen del TOKEN, nunca del cuerpo de la petición
(antes cualquiera podía enviar {"usuario": "x", "rol": "jefe_guardia"}).

Configuración (variables de entorno):
    MEDIFLOW_USUARIOS='{"<token-largo-y-aleatorio>": {"usuario": "dra.perez", "rol": "auditor_clinico"},
                        "<otro-token>": {"usuario": "n8n", "rol": "integracion"}}'
    MEDIFLOW_AUTH_DESACTIVADA=1      # SOLO para pruebas locales; el servidor lo advierte en el log

Sin usuarios configurados y sin desactivarla, la API rechaza todo (falla cerrada, 503).
Genera tokens con:  python3 -c "import secrets; print(secrets.token_urlsafe(32))"
"""
from __future__ import annotations

import hmac
import json
import logging
import os
from dataclasses import dataclass
from typing import Optional

from fastapi import Header, HTTPException

from .revision import ROLES_REVISORES

log = logging.getLogger("mediflow.seguridad")

ROL_INTEGRACION = "integracion"          # cuenta de servicio (n8n, cola): ingresa y consulta, NO resuelve ni acusa


@dataclass(frozen=True)
class Usuario:
    usuario: str
    rol: str


class Autenticador:
    def __init__(self, tabla: Optional[dict[str, Usuario]] = None, desactivada: bool = False):
        self.tabla = tabla or {}
        self.desactivada = desactivada

    @classmethod
    def desde_entorno(cls) -> "Autenticador":
        desactivada = os.getenv("MEDIFLOW_AUTH_DESACTIVADA") == "1"
        tabla: dict[str, Usuario] = {}
        crudo = os.getenv("MEDIFLOW_USUARIOS")
        if crudo:
            for token, datos in json.loads(crudo).items():
                if len(token) < 16:
                    raise ValueError("MEDIFLOW_USUARIOS: cada token debe tener al menos 16 caracteres")
                tabla[token] = Usuario(str(datos["usuario"]), str(datos["rol"]))
        if desactivada:
            log.warning("AUTENTICACIÓN DESACTIVADA (MEDIFLOW_AUTH_DESACTIVADA=1): solo para pruebas locales")
        elif not tabla:
            log.warning("MEDIFLOW_USUARIOS no está configurado: la API rechazará todas las peticiones")
        return cls(tabla, desactivada)

    def autenticar(self, authorization: Optional[str]) -> Optional[Usuario]:
        """Devuelve el Usuario (o None si la autenticación está desactivada). Lanza 401/503."""
        if self.desactivada:
            return None
        if not self.tabla:
            raise HTTPException(503, "autenticación no configurada en este servidor")
        esquema, _, token = (authorization or "").partition(" ")
        if esquema.lower() != "bearer" or not token:
            raise HTTPException(401, "falta el token (Authorization: Bearer ...)", headers={"WWW-Authenticate": "Bearer"})
        encontrado = None
        for t, u in self.tabla.items():            # sin cortar en el primero: tiempo constante por token
            if hmac.compare_digest(t.encode(), token.encode()):
                encontrado = u
        if encontrado is None:
            raise HTTPException(401, "token inválido", headers={"WWW-Authenticate": "Bearer"})
        return encontrado


def requerir(auth: Autenticador, *roles_permitidos: str):
    """Dependencia de FastAPI: exige un token válido cuyo rol esté entre `roles_permitidos`."""
    permitidos = set(roles_permitidos)

    def dependencia(authorization: Optional[str] = Header(default=None)) -> Optional[Usuario]:
        u = auth.autenticar(authorization)
        if u is not None and u.rol not in permitidos:
            raise HTTPException(403, f"el rol {u.rol!r} no tiene permiso para esta operación")
        return u

    return dependencia


ROLES_LECTURA = ROLES_REVISORES | {ROL_INTEGRACION}
