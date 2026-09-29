"""Nodos del grafo LangGraph: uno por etapa del ciclo de vida.

Convenciones
  * Cada nodo devuelve solo el diff de estado; `historial` y `eventos` usan reducer de suma.
  * Toda transición pasa por `Ciclo` (guardas RN-I1 a RN-I5).
  * Nunca se escribe un dato del paciente en historial, eventos ni logs (RN-M4): solo IDs,
    códigos, nombres de regla y clases de error.
  * Los nodos con `interrupt()` no tienen efectos secundarios antes de la llamada, porque
    LangGraph re-ejecuta el nodo desde el inicio al reanudar.
"""
from __future__ import annotations

import operator
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Annotated, Any, Callable, Optional, TypedDict

from langgraph.types import interrupt

from .ciclo_vida import Ciclo, Estado, SISTEMA, USUARIO, TransicionInvalida
from .config import Config, PROMPT_VERSION, REGLAS_VERSION
from .enrutamiento import decidir_ruta
from .evaluacion import Evaluacion, evaluar as evaluar_reglas
from .identidad import obtener_pack
from .llm import Cadenas
from .modelos import (Canal, Clasificacion, Dominio, Extraccion, Prioridad, TipoDocumento)
from .privacidad import Seudonimizador
from .puertos import Almacen, Despachador, Notificador
from .reglas_clinicas import CRITICOS, detectar
from .revision import (USUARIOS_NO_HUMANOS, DecisionHumana, DecisionInvalida, aplicar_correcciones,
                       validar_decision)

T = TipoDocumento
FORMATOS_ACEPTADOS = {"pdf", "jpg", "jpeg", "png", "texto", "txt", "json"}       # RN-A1
CARPETA_NIVEL = {"Rutina": "procesados/rutina", "Urgente": "procesados/urgentes",
                 "Crítico": "procesados/criticos"}                               # RN-G1


class ErrorTecnico(Exception):
    """Fallo esperable de una etapa (timeout, respuesta inválida, ruta no soportada)."""


class ErrorPermanente(ErrorTecnico):
    """Fallo que reintentar no arregla (p. ej. formato sin ruta implementada): va directo a
    revisión humana, sin gastar reintentos ni espera."""


FORMATOS_TEXTO = {"texto", "txt", "json"}


def _texto_plano(req: dict) -> str:
    """Contenido como texto clínico SOLO si el formato es textual. Un PDF/imagen (bytes, o su
    base64 dentro de un JSON) no es texto: nunca se le pasa a reglas de texto ni al LLM."""
    contenido = req.get("contenido")
    if str(req.get("formato", "texto")).lower() in FORMATOS_TEXTO and isinstance(contenido, str):
        return contenido
    return ""


class EstadoDoc(TypedDict, total=False):
    request: dict
    documento_id: str
    version: int
    pais: str
    clave_alerta: str
    posible_duplicado_de: Optional[str]
    cobertura: Optional[str]
    estado: str
    historial: Annotated[list[dict], operator.add]
    eventos: Annotated[list[dict], operator.add]
    decisiones: Annotated[list[dict], operator.add]
    correcciones: Annotated[list[dict], operator.add]
    texto_seudonimizado: str
    mapa_tokens: dict
    clasificacion: Optional[dict]
    extraccion: Optional[dict]
    evaluacion: Optional[dict]
    prioridad: str
    motivos_revision: list
    campos_dudosos: list
    revision: Optional[dict]
    ronda_revision: int
    decision_actual: Optional[dict]
    alto_riesgo: bool
    fallo: Optional[dict]
    intentos: dict
    prioridad_cola: Optional[str]
    alerta: Optional[dict]
    destinos: Optional[dict]
    entrega: Optional[dict]
    rechazo: Optional[dict]
    status_backup: str
    resultado: Optional[dict]


def _ts() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Dependencias:
    cadenas: Cadenas
    almacen: Almacen
    notificador: Notificador
    despachador: Despachador
    config: Config = field(default_factory=Config)
    reloj: Callable[[], str] = _ts
    dormir: Callable[[float], None] = time.sleep
    # (clave_documento, nivel) ya alertados: RN-Q1 (una alerta por documento y nivel),
    # RN-O2 (solo alerta si sube de nivel) y RN-O3 (duplicado no repite alerta).
    # En producción esto vive en una base de datos, no en memoria.
    alertas_emitidas: set = field(default_factory=set)


# ------------------------------------------------------------------------------------------
def _reidentificar(obj: Any, mapa: dict) -> Any:
    if isinstance(obj, str):
        return Seudonimizador.reidentificar(obj, mapa)
    if isinstance(obj, list):
        return [_reidentificar(x, mapa) for x in obj]
    if isinstance(obj, dict):
        return {k: _reidentificar(v, mapa) for k, v in obj.items()}
    return obj


def _fusionar(state: dict, upd: dict) -> dict:
    """Estado + diff, respetando los reducers de suma (para armar el resultado final)."""
    m = dict(state)
    for k, v in upd.items():
        m[k] = [*(state.get(k) or []), *v] if k in ("historial", "eventos", "decisiones", "correcciones") else v
    return m


def armar_resultado(s: dict, cfg: Config) -> dict:
    """JSON de resultado (RN-G2, G6, R5). AJUSTAR los nombres al contrato del brief (RN-G7):
    aquí uso los campos que menciona el documento y solo añado campos nuevos."""
    clas, ev, dest = s.get("clasificacion") or {}, s.get("evaluacion") or {}, s.get("destinos") or {}
    rev = s.get("revision") or {}
    return {
        "documento_id": s.get("documento_id"),
        "version": s.get("version", 1),
        "pais_origen": s.get("pais"),
        "estado": s.get("estado"),
        "tipo_documento": clas.get("tipo"),
        "nivel_prioridad": s.get("prioridad"),
        "requiere_auditoria_humana": bool(s.get("ronda_revision")),
        "motivos_revision": rev.get("motivos", []),
        "campos_dudosos": rev.get("campos_dudosos", []),
        "identidad": ev.get("estado_identidad"),
        "clasificacion": s.get("clasificacion"),
        "extraccion": s.get("extraccion"),
        "destino_principal": dest.get("principal"),
        "destinos_secundarios": dest.get("secundarios", []),
        "destinos_retenidos": dest.get("retenidos", []),
        "avisos": dest.get("avisos", []),
        "banderas": dest.get("banderas", {}),
        "alto_riesgo": bool(s.get("alto_riesgo")),
        "entrega": s.get("entrega"),
        "notificacion_generada": s.get("alerta"),
        "status_backup": s.get("status_backup"),
        "posible_duplicado_de": s.get("posible_duplicado_de"),
        "rechazo": s.get("rechazo"),
        "prioridad_cola": s.get("prioridad_cola"),
        "reglas_disparadas": ev.get("reglas", []),
        "news2": ev.get("news2"),
        "decisiones_humanas": s.get("decisiones", []),
        "correcciones": s.get("correcciones", []),
        "historial": s.get("historial", []),
        "eventos": s.get("eventos", []),
        "proceso": {"pack": s.get("pais"), "reglas_version": REGLAS_VERSION,
                    "prompt_version": PROMPT_VERSION, "modelo": cfg.modelo},
    }


class Nodos:
    def __init__(self, deps: Dependencias):
        self.d, self.cfg = deps, deps.config
        # Etapas que llaman al LLM: cualquier excepción → FALLO_TECNICO (RN-P2, P3)
        self.clasificar = self._con_fallo("clasificar", self._clasificar)
        self.extraer = self._con_fallo("extraer", self._extraer)

    # ---------------------------------------------------------------- utilidades
    def _ciclo(self, state: dict) -> Ciclo:
        return Ciclo(state, self.d.reloj)

    def _evento(self, tipo: str, **datos) -> dict:
        return {"ts": self.d.reloj(), "tipo": tipo, **datos}

    def _notificar_operativo(self, tipo: str, destinatario: str, docid: str, **extra) -> list[dict]:
        """Aviso operativo, distinto de la alerta clínica de `alertar()`: entrada a
        revisión humana o reintentos agotados. No depende del nivel de prioridad
        (a diferencia de RN-Q3, que solo aplica a la alerta clínica) porque un
        documento en cola o un fallo técnico necesitan que alguien los mire aunque
        el caso sea clínicamente Rutina. Nunca bloquea el pipeline (RN-P6): un
        fallo de notificación queda registrado en eventos, no se relanza."""
        carga = {"documento_id": docid, "tipo": tipo, "destinatario": destinatario,
                 "enlace": f"{self.cfg.enlace_base}/{docid}", **extra}
        for canal in self.cfg.canales_alerta:                      # RN-P7: intenta el canal alterno
            try:
                self.d.notificador.enviar(canal, carga)
                return [self._evento(f"{tipo}_notificado", canal=canal)]
            except Exception as exc:
                continue
        return [self._evento(f"{tipo}_notificacion_fallida", error="todos_los_canales_caidos")]

    def _guardar(self, ruta: str, contenido: Any) -> str:
        try:
            self.d.almacen.guardar(ruta, contenido)
            return "ok"
        except Exception:                      # RN-G3, RN-P6: un fallo de respaldo no invalida el triaje
            return "error"

    def _cerrar_con_resultado(self, state: dict, upd: dict, carpeta: str) -> dict:
        fusion = _fusionar(state, upd)
        res = armar_resultado(fusion, self.cfg)
        estado_bk = self._guardar(f"{fusion.get('pais')}/{carpeta}/{fusion.get('documento_id') or 'sin_id'}.json", res)
        if estado_bk == "error" or fusion.get("status_backup") == "error":
            res["status_backup"] = "error"
        return {**upd, "resultado": res, "status_backup": res["status_backup"]}

    def _con_fallo(self, etapa: str, fn: Callable[[dict], dict]) -> Callable[[dict], dict]:
        def nodo(state: dict) -> dict:
            try:
                return fn(state)
            except TransicionInvalida:
                raise                          # bug de programación, no un fallo reintentable
            except Exception as exc:
                c = self._ciclo(state)
                previo = c.estado
                # Solo el nombre de la clase: el mensaje podría incluir texto del paciente (RN-M4)
                c.ir(Estado.FALLO_TECNICO, SISTEMA, f"{etapa}: {type(exc).__name__}")
                return c.update(fallo={"etapa": etapa, "estado_previo": previo.value,
                                       "error": type(exc).__name__,
                                       "permanente": isinstance(exc, ErrorPermanente)})
        nodo.__name__ = etapa
        return nodo

    # ---------------------------------------------------------------- RECIBIDO
    def recibir(self, state: dict) -> dict:
        req = state["request"]
        pais = self.cfg.pais_instalacion.upper()       # RN-A3 / RN-S2: instalación exclusiva Colombia
        docid = str(req.get("documento_id") or "")
        version = state.get("version", 1)
        c = self._ciclo({})
        c.ir(Estado.RECIBIDO, SISTEMA, "documento recibido")
        bk = self._guardar(f"{pais}/recibidos/{docid or 'sin_id'}/v{version}", req.get("contenido"))   # RN-P1
        return c.update(pais=pais, documento_id=docid, version=version, status_backup=bk,
                        clave_alerta=state.get("clave_alerta") or docid, cobertura=req.get("cobertura_paciente"),
                        intentos={}, motivos_revision=[], campos_dudosos=[], ronda_revision=0)

    # ---------------------------------------------------------------- VALIDADO / RECHAZADO
    def _error_validacion(self, req: dict) -> Optional[tuple[str, str]]:
        if not str(req.get("documento_id") or "").strip():
            return "ID_AUSENTE", "documento_id es obligatorio (RN-A2)"
        pais_req = req.get("pais_origen")
        if pais_req and str(pais_req).upper() != self.cfg.pais_instalacion.upper():
            return "PAIS_NO_SOPORTADO", f"esta instalación solo procesa documentos de {self.cfg.pais_instalacion} (RN-S2)"
        formato = str(req.get("formato", "texto")).lower()
        if formato not in FORMATOS_ACEPTADOS:
            return "FORMATO_NO_SOPORTADO", f"formato {formato!r} no aceptado (RN-A1)"
        contenido = req.get("contenido")
        if contenido is None or len(contenido) == 0:
            return "CONTENIDO_VACIO", "el documento no trae contenido"
        tam = req.get("tamano_bytes") or (len(contenido.encode()) if isinstance(contenido, str) else len(contenido))
        if tam > self.cfg.max_bytes:
            return "TAMANO_EXCEDIDO", f"{tam} bytes supera el máximo de {self.cfg.max_bytes} (RN-O5)"
        if req.get("canal_origen") not in {c.value for c in Canal}:
            return "CANAL_ORIGEN_INVALIDO", "canal_origen obligatorio y válido (RN-A9)"
        return None

    def validar(self, state: dict) -> dict:
        c = self._ciclo(state)
        error = self._error_validacion(state["request"])
        if error:                                # RN-I5: el sistema solo rechaza aquí
            codigo, detalle = error
            c.ir(Estado.RECHAZADO, SISTEMA, f"{codigo}: {detalle}")
            return self._cerrar_con_resultado(state, c.update(rechazo={"codigo": codigo, "detalle": detalle}), "rechazados")
        c.ir(Estado.VALIDADO, SISTEMA, "formato, tamaño e identificadores válidos")
        return c.update()

    # ---------------------------------------------------------------- CLASIFICADO
    def _clasificar(self, state: dict) -> dict:
        req = state["request"]
        contenido = _texto_plano(req)
        if not contenido:
            raise ErrorPermanente("la ruta de PDF/imagen (OCR o visión) no está implementada en este MVP")
        conocidos = [req["nombre_paciente"]] if req.get("nombre_paciente") else []
        texto_seud, mapa = Seudonimizador(conocidos).seudonimizar(contenido)      # RN-M1
        out = Clasificacion.model_validate(
            self.d.cadenas.clasificador.invoke({"texto": texto_seud, "pais": state["pais"]}))   # RN-P3

        motivos = list(state.get("motivos_revision", []))
        if out.dominio is Dominio.OTRO and out.tipo is not T.CERTIFICADO:          # RN-B3
            motivos.append("fuera_de_alcance")
        if out.tipo is T.NO_CLASIFICABLE or out.confianza < self.cfg.umbrales.clasificacion:   # RN-B4
            motivos.append("clasificacion_baja_confianza")

        c = self._ciclo(state)
        c.ir(Estado.CLASIFICADO, SISTEMA, f"{out.tipo.value} (confianza {out.confianza:.2f})")
        return c.update(fallo=None, texto_seudonimizado=texto_seud, mapa_tokens=mapa,
                        clasificacion=out.model_dump(mode="json"), motivos_revision=motivos)

    # ---------------------------------------------------------------- EXTRAIDO
    def _extraer(self, state: dict) -> dict:
        clas = Clasificacion.model_validate(state["clasificacion"])
        pack = obtener_pack(state["pais"])
        out = Extraccion.model_validate(self.d.cadenas.extractor.invoke(
            {"texto": state["texto_seudonimizado"], "tipo": clas.tipo.value,
             "separador_decimal": pack.separador_decimal}))
        datos = _reidentificar(out.model_dump(mode="json"), state["mapa_tokens"])   # re-identificación local
        c = self._ciclo(state)
        c.ir(Estado.EXTRAIDO, SISTEMA, "extracción estructurada completa")
        return c.update(fallo=None, extraccion=datos)

    # ---------------------------------------------------------------- FALLO_TECNICO
    def fallo_tecnico(self, state: dict) -> dict:
        f = state["fallo"]
        etapa = f["etapa"]
        intentos = dict(state.get("intentos") or {})
        n = intentos[etapa] = intentos.get(etapa, 0) + 1
        c = self._ciclo(state)
        if n <= self.cfg.max_reintentos and not f.get("permanente"):      # RN-P2: espera creciente
            self.d.dormir(self.cfg.backoff_base_s * 2 ** (n - 1))
            c.ir(Estado(f["estado_previo"]), SISTEMA,
                 f"reintento {n}/{self.cfg.max_reintentos} de {etapa} tras {f['error']}")
            return c.update(intentos=intentos, fallo=None)

        # Reintentos agotados → revisión humana con motivo fallo_tecnico. Antes, RN-P4:
        # la detección textual determinística no depende del LLM y sigue corriendo.
        upd: dict = {"intentos": intentos, "fallo": {**f, "agotado": True},
                     "motivos_revision": [*state.get("motivos_revision", []), "fallo_tecnico"],
                     "prioridad": state.get("prioridad") or Prioridad.RUTINA.value}
        contenido = _texto_plano(state["request"])
        if contenido:
            det = detectar(CRITICOS, None, contenido)
            reglas = [{"regla": "RN-P4", "concepto": h.concepto, "via": h.via, "evidencia": h.evidencia}
                      for h in det.hallazgos]
            if det.hallazgos:
                upd["prioridad"] = Prioridad.CRITICO.value
            upd["evaluacion"] = {"prioridad": upd["prioridad"], "reglas": reglas, "estado_identidad": None}
        else:
            upd["prioridad_cola"] = Prioridad.CRITICO.value               # imágenes: prioridad máxima en la cola
        upd["eventos"] = [self._evento("reintentos_agotados", etapa=etapa, error=f["error"]),
                          *self._notificar_operativo("fallo_tecnico", self.cfg.destinatario_fallo_tecnico,
                                                     state["documento_id"], etapa=etapa, error=f["error"])]
        return upd

    # ---------------------------------------------------------------- EVALUADO
    def evaluar(self, state: dict) -> dict:
        req = state["request"]
        contenido = _texto_plano(req)
        clas = Clasificacion.model_validate(state["clasificacion"])
        ext = Extraccion.model_validate(state["extraccion"])
        ev = evaluar_reglas(texto=contenido, clasificacion=clas, extraccion=ext, pais=state["pais"],
                            config=self.cfg, motivos_previos=tuple(state.get("motivos_revision", [])))
        # RN-E10/E11: un dato de cobertura faltante o sin confirmar también manda a revisión
        ruta = decidir_ruta(tipo=clas.tipo, ev=ev, ext=ext, canal=req["canal_origen"],
                            pack=obtener_pack(state["pais"]), cobertura=state.get("cobertura"))
        ev.motivos_revision = list(dict.fromkeys([*ev.motivos_revision, *ruta.motivos_revision]))

        c = self._ciclo(state)
        c.ir(Estado.EVALUADO, SISTEMA,
             f"prioridad {ev.prioridad.value}; revisión humana: {', '.join(ev.motivos_revision) or 'no'}")
        return c.update(evaluacion=ev.a_dict(), prioridad=ev.prioridad.value,
                        motivos_revision=ev.motivos_revision, campos_dudosos=ev.campos_dudosos,
                        alto_riesgo=ev.alto_riesgo)

    # ---------------------------------------------------------------- Alertas (RN-D9, F1, F3, Q1, Q4, P7)
    def alertar(self, state: dict) -> dict:
        """Se ejecuta tras EVALUADO, tras un fallo agotado y tras una resolución humana.
        Es idempotente por (documento, nivel). No espera a la revisión humana (RN-D9, RN-I6)."""
        nivel = Prioridad(state.get("prioridad") or Prioridad.RUTINA.value)
        if nivel is Prioridad.RUTINA:                                       # RN-Q3: rutina no notifica
            return {}
        clave = (state.get("clave_alerta") or state["documento_id"], nivel.value)
        if clave in self.d.alertas_emitidas:
            return {}

        docid = state["documento_id"]
        critico = nivel is Prioridad.CRITICO
        destinatario = self.cfg.destinatario_critico if critico else self.cfg.destinatario_urgente
        carga = {"documento_id": docid, "tipo": "alerta_clinica", "nivel": nivel.value,   # RN-Q4: nada del paciente
                 "destinatario": destinatario, "enlace": f"{self.cfg.enlace_base}/{docid}"}
        canal_usado, fallidos = None, []
        for canal in self.cfg.canales_alerta:                               # RN-P7: canal alterno
            try:
                self.d.notificador.enviar(canal, carga)
                canal_usado = canal
                break
            except Exception as exc:
                fallidos.append({"canal": canal, "error": type(exc).__name__})
        if canal_usado:            # RN-Q1: solo cuenta como emitida si realmente salió; si falló, se reintenta
            self.d.alertas_emitidas.add(clave)
        notificacion = {
            "canal": canal_usado,
            "destinatario": destinatario,
            "fecha_hora": self.d.reloj(),
            "estado_acuse": "pendiente" if critico else "no_aplica",         # RN-F1 / RN-F3
            "estado_envio": "enviada" if canal_usado else "fallida",
            "nivel": nivel.value,
            "emitida_en_estado": state["estado"],                            # RN-I6: puede ser EN_REVISION_HUMANA, etc.
        }
        eventos = [self._evento("alerta_emitida", nivel=nivel.value, canal=canal_usado, estado=state["estado"])]
        if fallidos:
            notificacion["canales_fallidos"] = fallidos
        if not canal_usado:                                                  # RN-P7: escala y se registra
            notificacion["escalada_a"] = "siguiente_rol"
            eventos.append(self._evento("alerta_escalada_por_canal_caido", nivel=nivel.value))
        return {"alerta": notificacion, "eventos": eventos}

    # ---------------------------------------------------------------- EN_REVISION_HUMANA
    def enviar_a_revision(self, state: dict) -> dict:
        motivos = list(dict.fromkeys(state.get("motivos_revision", [])))
        c = self._ciclo(state)
        c.ir(Estado.EN_REVISION_HUMANA, SISTEMA, "motivos: " + ", ".join(motivos))
        revision = {"motivos": motivos, "campos_dudosos": state.get("campos_dudosos", [])}
        self._guardar(f"{state['pais']}/auditoria_humana/{state['documento_id']}.json",     # RN-G1
                      {"documento_id": state["documento_id"], "prioridad": state.get("prioridad"),
                       "prioridad_cola": state.get("prioridad_cola"), **revision})
        eventos = self._notificar_operativo("revision_humana", self.cfg.destinatario_revision_humana,
                                            state["documento_id"], motivos=motivos,
                                            prioridad_cola=state.get("prioridad_cola") or state.get("prioridad"))
        return c.update(revision=revision, ronda_revision=state.get("ronda_revision", 0) + 1, eventos=eventos)

    def esperar_humano(self, state: dict) -> dict:
        # RN-I4: el grafo se detiene aquí. Ninguna regla automática lo mueve hasta que un humano decida.
        valor = interrupt({"tipo": "revision_humana", "documento_id": state["documento_id"],
                           "prioridad": state.get("prioridad"), "prioridad_cola": state.get("prioridad_cola"),
                           **(state.get("revision") or {})})
        d = DecisionHumana.model_validate(valor)
        validar_decision(d, prioridad_actual=Prioridad(state.get("prioridad") or "Rutina"),
                         tiene_clasificacion=bool(state.get("clasificacion")))
        registro = {"usuario": d.usuario, "rol": d.rol, "accion": d.accion, "ts": self.d.reloj(),
                    "motivo": d.motivo, "justificacion": d.justificacion}       # RN-G4
        c = self._ciclo(state)
        if d.accion == "rechazar":                                              # RN-I5: solo un revisor, con motivo
            c.ir(Estado.RECHAZADO, USUARIO, f"rechazado por {d.usuario}: {d.motivo}")
            return self._cerrar_con_resultado(state, c.update(decisiones=[registro]), "rechazados")

        especiales = {"tipo_documento", "dominio", "cobertura_paciente"}
        datos, pares = aplicar_correcciones(state.get("extraccion") or Extraccion().model_dump(mode="json"),
                                            {k: v for k, v in d.correcciones.items() if k not in especiales})
        clas = dict(state.get("clasificacion") or {})
        if "tipo_documento" in d.correcciones or "dominio" in d.correcciones or not clas:
            clas = {"setting": "ambulatorio", "especialidad": "", "rol_autor": "", "confianza": 1.0,
                    "prioridad_propuesta": "Rutina", "dominio": "Mixto", **clas}
            for origen, destino in (("tipo_documento", "tipo"), ("dominio", "dominio")):
                if origen in d.correcciones:
                    pares.append({"campo": origen, "extraido": clas.get(destino), "corregido": d.correcciones[origen]})
                    clas[destino] = d.correcciones[origen]
            clas["confianza"] = 1.0
        c.ir(Estado.RESUELTO, USUARIO, f"{d.accion} por {d.usuario}")
        return c.update(extraccion=datos, clasificacion=clas, decisiones=[registro], correcciones=pares,      # RN-J8
                        cobertura=d.correcciones.get("cobertura_paciente", state.get("cobertura")),
                        decision_actual=d.model_dump(mode="json"))

    def post_revision(self, state: dict) -> dict:
        """RN-J4: re-ejecuta las reglas determinísticas sobre los datos corregidos. Sin LLM."""
        contenido = _texto_plano(state["request"])
        ev = evaluar_reglas(texto=contenido, clasificacion=Clasificacion.model_validate(state["clasificacion"]),
                            extraccion=Extraccion.model_validate(state["extraccion"]), pais=state["pais"],
                            config=self.cfg, revisado_por_humano=True)
        d = state.get("decision_actual") or {}
        if d.get("prioridad_nueva"):                                    # RN-J5 (ya validado al recibir la decisión)
            nueva = Prioridad(d["prioridad_nueva"])
            ev.reglas.append({"regla": "RN-J5", "usuario": d["usuario"], "de": ev.prioridad.value,
                              "a": nueva.value, "justificacion": d.get("justificacion")})
            ev.prioridad = nueva
        c = self._ciclo(state)
        if Estado.EVALUADO.value not in c.visitados():                  # llegó por fallo técnico: RN-I2 exige evaluar
            c.ir(Estado.EVALUADO, SISTEMA, "reglas re-ejecutadas tras la resolución (RN-J4, RN-I2)")
        return c.update(evaluacion=ev.a_dict(), prioridad=ev.prioridad.value, motivos_revision=[],
                        campos_dudosos=[], alto_riesgo=ev.alto_riesgo, fallo=None)

    # ---------------------------------------------------------------- ENRUTADO / ENTREGADO
    def enrutar(self, state: dict) -> dict:
        clas = Clasificacion.model_validate(state["clasificacion"]) if state.get("clasificacion") else None
        ruta = decidir_ruta(tipo=clas.tipo if clas else None, ev=Evaluacion.desde_dict(state["evaluacion"]),
                            ext=Extraccion.model_validate(state.get("extraccion") or {}),
                            canal=state["request"]["canal_origen"], pack=obtener_pack(state["pais"]),
                            cobertura=state.get("cobertura"), revisado=bool(state.get("ronda_revision")))
        destinos = {"principal": ruta.principal.value if ruta.principal else None,
                    "secundarios": [d.value for d in ruta.secundarios],
                    "retenidos": [d.value for d in ruta.retenidos],
                    "todos": [d.value for d in ruta.todos],
                    "avisos": ruta.avisos, "banderas": ruta.banderas}
        c = self._ciclo(state)
        c.ir(Estado.ENRUTADO, SISTEMA, f"destino principal: {destinos['principal']}")
        return c.update(destinos=destinos, entrega={"entregados": [], "fallidos": [], "intentos": 0})

    def entregar(self, state: dict) -> dict:
        ent, dest = dict(state["entrega"]), state["destinos"]
        if ent["intentos"] > 0:
            self.d.dormir(self.cfg.backoff_base_s * 2 ** (ent["intentos"] - 1))
        carga = {"documento_id": state["documento_id"], "tipo_documento": (state.get("clasificacion") or {}).get("tipo"),
                 "nivel_prioridad": state.get("prioridad"), "extraccion": state.get("extraccion"),
                 "banderas": dest["banderas"], "avisos": dest["avisos"], "alto_riesgo": state.get("alto_riesgo")}
        ent["fallidos"] = []
        for d in dest["todos"]:
            if d in ent["entregados"] or d in dest["retenidos"]:
                continue
            try:
                ok = self.d.despachador.entregar(d, carga)
            except Exception:
                ok = False
            (ent["entregados"] if ok else ent["fallidos"]).append(d)
        ent["intentos"] += 1
        eventos = [self._evento("entrega_fallida", destinos=ent["fallidos"], intento=ent["intentos"])] if ent["fallidos"] else []
        return {"entrega": ent, "eventos": eventos}

    def esperar_acuse(self, state: dict) -> dict:
        valor = interrupt({"tipo": "acuse", "documento_id": state["documento_id"], "nivel": "Crítico",
                           "enlace": f"{self.cfg.enlace_base}/{state['documento_id']}"})
        usuario = str((valor or {}).get("usuario", "")).strip()
        if usuario.lower() in USUARIOS_NO_HUMANOS or usuario.lower().startswith("svc"):
            raise DecisionInvalida("RN-Q5: el acuse lo da un usuario identificado; un 'leído' automático no cuenta")
        alerta = {**state["alerta"], "estado_acuse": "recibido", "acuse_por": usuario, "acuse_ts": self.d.reloj()}
        return {"alerta": alerta, "eventos": [self._evento("acuse", usuario=usuario)]}

    def cerrar(self, state: dict) -> dict:
        dest, ent, alerta = state["destinos"], state["entrega"], state.get("alerta")
        pendientes = [d for d in dest["todos"] if d not in ent["entregados"]]
        critico = state.get("prioridad") == Prioridad.CRITICO.value
        acuse_ok = not (critico and alerta and alerta.get("estado_acuse") != "recibido")     # RN-J7
        c = self._ciclo(state)
        if not pendientes and acuse_ok:
            c.ir(Estado.ENTREGADO, SISTEMA, "todos los destinos confirmaron" + (" y la alerta tiene acuse" if critico and alerta else ""))
        upd = c.update(entrega={**ent, "pendientes": pendientes})
        return self._cerrar_con_resultado(state, upd, CARPETA_NIVEL.get(state.get("prioridad"), "procesados/rutina"))
