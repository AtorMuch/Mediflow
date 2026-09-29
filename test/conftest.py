"""Utilidades de prueba: cadenas LLM falsas (sin red) y constructores de casos."""
from __future__ import annotations

import pytest
from langchain_core.runnables import RunnableLambda

from mediflow.agente import AgenteMediFlow
from mediflow.config import Config
from mediflow.llm import Cadenas
from mediflow.modelos import (Campo, Clasificacion, Dominio, Extraccion, Medicamento, Prioridad,
                              Setting, SignosVitales, TipoDocumento as T)
from mediflow.nodos import Dependencias
from mediflow.puertos import AlmacenMemoria, DespachadorMemoria, NotificadorMemoria


def c(valor, conf=0.98) -> Campo:
    return Campo(valor=valor, confianza=conf)


def clas(tipo=T.IMAGENES, dominio=Dominio.NEUMOLOGIA, conf=0.95, prioridad=Prioridad.RUTINA, **kw) -> Clasificacion:
    return Clasificacion(tipo=tipo, dominio=dominio, setting=kw.pop("setting", Setting.AMBULATORIO),
                         confianza=conf, prioridad_propuesta=prioridad, **kw)


def base(**kw) -> dict:
    """Campos comunes. El extractor devuelve tokens: el agente los re-identifica en local."""
    d = dict(paciente_nombre=c("[PACIENTE_1]"), paciente_edad=c("58"),
             profesional=c("[PROF_1]"), fecha_documento=c("[FECHA_1]"))
    d.update(kw)
    return d


def ext_informe(codigo="J18.9", texto_dx="Neumonía", conclusion="Sin hallazgos críticos", **kw) -> Extraccion:
    return Extraccion(**base(estudio=c("TC de tórax"), hallazgos=c("descritos en el informe"),
                             conclusion=c(conclusion), diagnostico_texto=c(texto_dx),
                             diagnostico_codigo=c(codigo), **kw))


def ext_receta(nombre, via="oral", **kw) -> Extraccion:
    med = Medicamento(nombre=c(nombre), dosis=c("50 mg"), via=c(via), frecuencia=c("cada 12 h"), duracion=c("30 días"))
    return Extraccion(**base(medicamentos=[med], **kw))


def ext_orden(**kw) -> Extraccion:
    return Extraccion(**base(procedimiento=c("Cateterismo cardíaco"), indicacion_clinica=c("Dolor torácico"),
                             diagnostico_texto=c("Angina"), diagnostico_codigo=c("I20.9"),
                             sintomas=c("dolor torácico de esfuerzo"), hallazgos_previos=c("ECG con isquemia"), **kw))


def request(doc_id="DOC-1", texto="Informe de imágenes. Paciente: Juan Pérez, 58 años.", canal="Consulta_Ambulatoria", **kw) -> dict:
    return {"documento_id": doc_id, "contenido": texto, "formato": "texto", "canal_origen": canal, **kw}


TEXTO_TEP = ("Informe TC de tórax con contraste.\nPaciente: Juan Pérez Soto, 58 años.\n"
             "Médico: Dra. Ana Rojas.\nFecha: 12/03/2026.\nConclusión: TEP agudo bilateral.")


class Entorno:
    def __init__(self, agente, deps, llamadas, almacen, notificador, despachador):
        self.agente, self.deps, self.llamadas = agente, deps, llamadas
        self.almacen, self.notificador, self.despachador = almacen, notificador, despachador

    def procesar(self, **kw):
        return self.agente.procesar(request(**kw))


def hacer_entorno(clasificacion, extraccion, *, almacen=None, notificador=None, despachador=None, config=None) -> Entorno:
    """`clasificacion` y `extraccion` pueden ser un objeto fijo o una función que recibe el input de la cadena."""
    llamadas = {"clasificar": [], "extraer": []}

    def f_clas(x):
        llamadas["clasificar"].append(x)
        return clasificacion(x) if callable(clasificacion) else clasificacion

    def f_ext(x):
        llamadas["extraer"].append(x)
        return extraccion(x) if callable(extraccion) else extraccion

    almacen = almacen or AlmacenMemoria()
    notificador = notificador or NotificadorMemoria()
    despachador = despachador or DespachadorMemoria()
    deps = Dependencias(cadenas=Cadenas(RunnableLambda(f_clas), RunnableLambda(f_ext)), almacen=almacen,
                        notificador=notificador, despachador=despachador,
                        config=config or Config(), dormir=lambda s: None)
    return Entorno(AgenteMediFlow(deps), deps, llamadas, almacen, notificador, despachador)


@pytest.fixture
def entorno_tep():
    """Caso 1 del brief: TC de tórax con TEP, sin identificador del paciente."""
    return hacer_entorno(clas(prioridad=Prioridad.CRITICO), ext_informe("I26.9", "Tromboembolismo pulmonar", "TEP agudo"))
