"""Configuración. Umbrales de la sección 7 del documento de reglas.

Los umbrales de confianza y tiempo son configurables (RN-L1); los clínicos NEWS2 NO
viven aquí: están fijos en reglas_clinicas.py (RN-D5, RN-L2).
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field

REGLAS_VERSION = "0.1.0"   # RN-G6 / RN-R5
PROMPT_VERSION = "v1"      # RN-R5


@dataclass(frozen=True)
class Umbrales:
    clasificacion: float = 0.85
    identidad: float = 0.95
    medicamento_dosis: float = 0.95
    diagnostico_codigo: float = 0.90
    profesional: float = 0.85
    resto: float = 0.80


@dataclass
class Config:
    pais_instalacion: str = "CO"                       # RN-A3, RN-S2 (instalación exclusiva Colombia)
    umbrales: Umbrales = field(default_factory=Umbrales)
    max_bytes: int = 10 * 1024 * 1024                 # RN-O5 (valor por definir en el doc)
    max_reintentos: int = 3                           # RN-P2
    backoff_base_s: float = 1.0                       # espera creciente: base * 2^(n-1)
    max_reintentos_entrega: int = 3
    minutos_escalamiento: int = 15                    # RN-F2
    canales_alerta: tuple[str, ...] = ("slack", "email")   # RN-P7: el 2.º es alterno
    destinatario_critico: str = "jefe_de_guardia"          # RN-Q2 (cadena configurable por la clínica)
    destinatario_urgente: str = "profesional_solicitante"  # RN-F3
    destinatario_revision_humana: str = "equipo_revision_humana"   # aviso operativo, no clínico
    destinatario_fallo_tecnico: str = "equipo_ingenieria"           # idem: es una falla del sistema
    enlace_base: str = "https://mediflow.local/documentos"
    modelo: str = field(default_factory=lambda: os.getenv("MEDIFLOW_MODELO", "gpt-4o-mini"))
