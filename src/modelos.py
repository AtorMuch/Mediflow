"""Modelos de datos: enums del dominio y esquemas Pydantic de la salida del LLM."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class TipoDocumento(str, Enum):          # RN-B1: categorías cerradas
    RECETA = "Receta Médica"
    IMAGENES = "Informe de Imágenes"
    LABORATORIO = "Informe de Laboratorio"
    ORDEN = "Orden de Procedimiento"
    EPICRISIS = "Epicrisis o Alta"
    CERTIFICADO = "Certificado Médico"
    NO_CLASIFICABLE = "No Clasificable"


class Dominio(str, Enum):
    CARDIOLOGIA = "Cardiología"
    NEUMOLOGIA = "Neumología"
    MIXTO = "Mixto"
    OTRO = "Otro"


class Setting(str, Enum):
    AMBULATORIO = "ambulatorio"
    HOSPITALIZADO = "hospitalizado"
    URGENCIA = "urgencia"


class Prioridad(str, Enum):              # RN-D1, D6, D7
    RUTINA = "Rutina"
    URGENTE = "Urgente"
    CRITICO = "Crítico"

    @property
    def rango(self) -> int:
        return {"Rutina": 0, "Urgente": 1, "Crítico": 2}[self.value]

    @staticmethod
    def maxima(a: "Prioridad", b: "Prioridad") -> "Prioridad":
        """RN-D8: una regla puede subir la prioridad, nunca bajarla."""
        return a if a.rango >= b.rango else b


class Canal(str, Enum):                  # RN-A9
    GUARDIA = "Guardia_Emergencias"
    AMBULATORIA = "Consulta_Ambulatoria"
    HOSPITALIZADO = "Hospitalizado"
    EXTERNO = "Externo"


class Destino(str, Enum):                # RN-E1
    EMERGENCIA = "Cola_Emergencia_Medica"
    AUDITORIA = "Auditoria_Autorizaciones"
    FARMACIA = "Farmacia_Hospitalaria"
    HCE = "Historia_Clinica_Electronica"
    REVISION = "Cola_Revision_Humana"
    PROGRAMA = "Gestion_Programa_Cobertura"


class EstadoIdentidad(str, Enum):        # RN-A4
    VALIDO_VERIFICADO = "valido_verificado"
    VALIDO_FORMATO = "valido_formato"
    AUSENTE = "ausente"
    INVALIDO = "invalido"


# ---------- Esquemas que el LLM debe devolver (RN-P3: fuera de esquema = fallo) ----------

class Campo(BaseModel):
    valor: Optional[str] = Field(None, description="Valor literal del documento; null si no aparece.")
    confianza: float = Field(0.0, ge=0.0, le=1.0)


class SignosVitales(BaseModel):          # RN-C2
    fr: Optional[float] = Field(None, description="Frecuencia respiratoria (rpm)")
    spo2: Optional[float] = Field(None, description="Saturación de oxígeno (%)")
    fc: Optional[float] = Field(None, description="Frecuencia cardíaca (lpm)")
    pas: Optional[float] = Field(None, description="Presión arterial sistólica (mmHg)")
    temperatura: Optional[float] = Field(None, description="Temperatura (°C)")
    conciencia_alterada: Optional[bool] = Field(None, description="Cualquier nivel distinto de 'alerta'")
    oxigeno_suplementario: Optional[bool] = None


class Medicamento(BaseModel):
    nombre: Campo = Campo()
    dosis: Campo = Campo()
    via: Campo = Campo()
    frecuencia: Campo = Campo()
    duracion: Campo = Campo()


class Clasificacion(BaseModel):
    tipo: TipoDocumento
    dominio: Dominio
    setting: Setting
    especialidad: str = ""
    rol_autor: str = ""
    confianza: float = Field(ge=0.0, le=1.0)
    prioridad_propuesta: Prioridad = Prioridad.RUTINA


class Extraccion(BaseModel):
    paciente_nombre: Campo = Campo()
    paciente_edad: Campo = Campo()
    paciente_id: Campo = Campo()
    profesional: Campo = Campo()
    fecha_documento: Campo = Campo()
    diagnostico_texto: Campo = Campo()
    diagnostico_codigo: Campo = Campo()
    estudio: Campo = Campo()
    hallazgos: Campo = Campo()
    conclusion: Campo = Campo()
    procedimiento: Campo = Campo()
    indicacion_clinica: Campo = Campo()
    sintomas: Campo = Campo()
    hallazgos_previos: Campo = Campo()        # ECG, BNP, FEVI (RN-E5)
    diagnostico_egreso: Campo = Campo()
    tratamiento_indicado: Campo = Campo()
    control_programado: Campo = Campo()
    medicamentos: list[Medicamento] = Field(default_factory=list)
    signos_vitales: Optional[SignosVitales] = None
    hipercapnico_documentado: bool = False    # RN-D4
    embarazo: bool = False                    # RN-N2
    hallazgo_pendiente: bool = False          # RN-E2 (epicrisis crítica)
    prioridad_propuesta: Prioridad = Prioridad.RUTINA
