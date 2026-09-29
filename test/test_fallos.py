"""Fallos técnicos y operación: RN-P1 a P7, RN-D9, RN-I6, RN-G3, RN-J4 tras un fallo."""
import pytest

from conftest import TEXTO_TEP, c, clas, ext_informe, ext_receta, hacer_entorno
from mediflow.modelos import Campo, Dominio, Prioridad, TipoDocumento as T
from mediflow.puertos import AlmacenMemoria, DespachadorMemoria, NotificadorMemoria


def pasos(r):
    return [(h["de"], h["a"]) for h in r["resultado"]["historial"]]


def llm_caido(_):
    raise TimeoutError("el LLM no responde")


# ------------------------------------------------------------------ RN-P2: reintentos con espera creciente
def test_fallo_transitorio_se_recupera_sin_intervencion_humana():
    intentos = {"n": 0}

    def flaky(x):
        intentos["n"] += 1
        if intentos["n"] <= 2:
            raise TimeoutError("timeout")
        return clas()

    e = hacer_entorno(flaky, ext_informe(paciente_id=c("12.345.678-5")))
    r = e.procesar()
    assert r["estado"] == "ENTREGADO" and intentos["n"] == 3
    assert pasos(r).count(("VALIDADO", "FALLO_TECNICO")) == 2
    assert pasos(r).count(("FALLO_TECNICO", "VALIDADO")) == 2          # el reintento vuelve a la etapa que falló


def test_espera_creciente_entre_reintentos():
    esperas = []
    e = hacer_entorno(llm_caido, ext_informe())
    e.deps.dormir = esperas.append
    e.procesar()
    assert esperas == [1.0, 2.0, 4.0]                                  # base * 2^(n-1)


# ------------------------------------------------------------------ RN-P2 + P4: agotados → revisión, con alerta sin LLM
def test_llm_caido_con_tep_en_el_texto_alerta_y_va_a_revision_humana():
    e = hacer_entorno(llm_caido, ext_informe())
    r = e.procesar(texto=TEXTO_TEP)
    assert len(e.llamadas["clasificar"]) == 4                          # 1 intento + 3 reintentos
    assert r["estado"] == "EN_REVISION_HUMANA" and "fallo_tecnico" in r["pendiente"]["motivos"]
    # RN-P4 / RN-I6: la alerta clínica salió con el LLM caído, ANTES de EVALUADO.
    # Además del aviso clínico, ahora también salen los dos avisos operativos por
    # Slack: uno porque el LLM falló (equipo de ingeniería) y otro porque el
    # documento quedó en la cola de revisión humana (equipo de revisión).
    tipos = [a["tipo"] for _, a in e.notificador.enviados]
    assert sorted(tipos) == ["alerta_clinica", "fallo_tecnico", "revision_humana"]
    alerta = next(a for _, a in e.notificador.enviados if a["tipo"] == "alerta_clinica")
    assert alerta["nivel"] == "Crítico"
    assert r["resultado"]["notificacion_generada"]["emitida_en_estado"] == "FALLO_TECNICO"
    assert pasos(r)[-1] == ("FALLO_TECNICO", "EN_REVISION_HUMANA")
    assert e.despachador.entregas == []                                # RN-E8


def test_llm_caido_con_texto_sin_criticos_va_a_revision_sin_alerta_clinica():
    e = hacer_entorno(llm_caido, ext_informe())
    r = e.procesar(texto="Control de rutina sin hallazgos.")
    assert r["estado"] == "EN_REVISION_HUMANA"
    tipos = [a["tipo"] for _, a in e.notificador.enviados]
    # RN-Q3: al ser Rutina no hay alerta *clínica*, pero los avisos *operativos*
    # (fallo técnico + cola de revisión) no dependen de la prioridad clínica.
    assert sorted(tipos) == ["fallo_tecnico", "revision_humana"]


def test_documento_pdf_o_imagen_va_a_revision_con_prioridad_maxima_en_cola():
    e = hacer_entorno(clas(), ext_informe())
    r = e.agente.procesar({"documento_id": "IMG-1", "contenido": b"\x89PNG...", "formato": "png",
                           "canal_origen": "Externo"})
    assert r["estado"] == "EN_REVISION_HUMANA" and r["pendiente"]["prioridad_cola"] == "Crítico"
    assert e.llamadas["clasificar"] == [] and r["resultado"]["eventos"][0]["tipo"] == "reintentos_agotados"


def test_pdf_o_imagen_no_gasta_reintentos_ni_espera():
    esperas = []
    e = hacer_entorno(clas(), ext_informe())
    e.deps.dormir = esperas.append
    e.agente.procesar({"documento_id": "PDF-1", "contenido": b"%PDF-1.4", "formato": "pdf", "canal_origen": "Externo"})
    assert esperas == []                                   # error permanente: sin backoff


def test_pdf_en_base64_dentro_de_json_no_llega_al_llm_como_texto():
    e = hacer_entorno(clas(), ext_informe())
    r = e.agente.procesar({"documento_id": "PDF-2", "contenido": "JVBERi0xLjQK...", "formato": "pdf",
                           "canal_origen": "Externo"})
    assert e.llamadas["clasificar"] == [] and r["estado"] == "EN_REVISION_HUMANA"


def test_alerta_critica_que_no_salio_por_ningun_canal_se_reintenta_y_aparece_en_vencidas():
    e = hacer_entorno(clas(prioridad=Prioridad.CRITICO), ext_informe("I26.9", "TEP", "TEP agudo"),
                      notificador=NotificadorMemoria(canales_caidos={"slack", "email"}))
    r = e.procesar(texto=TEXTO_TEP)
    assert r["resultado"]["notificacion_generada"]["estado_envio"] == "fallida"
    assert not e.deps.alertas_emitidas                     # no se marcó como emitida: puede reintentarse
    vencidas = e.agente.alertas_vencidas()
    assert vencidas and vencidas[0]["motivo"] == "envio_fallido"


# ------------------------------------------------------------------ RN-P3: fuera de esquema = fallo, no se adivina
def test_respuesta_fuera_de_esquema_es_fallo_tecnico():
    e = hacer_entorno(lambda x: {"tipo": "Categoría inventada", "confianza": 7}, ext_informe())
    r = e.procesar()
    assert r["estado"] == "EN_REVISION_HUMANA"
    assert any(ev["tipo"] == "reintentos_agotados" and ev["error"] == "ValidationError" for ev in r["resultado"]["eventos"])


def test_el_historial_no_contiene_datos_del_paciente_rn_m4():
    e = hacer_entorno(llm_caido, ext_informe())
    r = e.procesar(texto=TEXTO_TEP)
    volcado = str(r["resultado"]["historial"]) + str(r["resultado"]["eventos"])
    assert "Juan" not in volcado and "Pérez" not in volcado and "no responde" not in volcado


# ------------------------------------------------------------------ Revisión tras fallo: RN-J4 + RN-I2
def test_resolver_un_fallo_tecnico_re_evalua_antes_de_enrutar():
    e = hacer_entorno(llm_caido, ext_informe())
    e.procesar(texto="Certificado de reposo por 3 días.")
    r = e.agente.resolver("DOC-1", {
        "usuario": "aud.gomez", "rol": "auditor_clinico", "accion": "corregir",
        "correcciones": {"tipo_documento": "Certificado Médico", "paciente_nombre": "Juan Pérez",
                         "paciente_edad": "58", "profesional": "Dra. Rojas", "fecha_documento": "12/03/2026"}})
    p = [a for _, a in pasos(r)]
    # Sin identificador la HCE queda retenida (RN-A4): el documento termina ENRUTADO, no ENTREGADO
    assert p[-3:] == ["RESUELTO", "EVALUADO", "ENRUTADO"]
    assert p.index("EVALUADO") < p.index("ENRUTADO")                   # RN-I2 incluso viniendo de FALLO_TECNICO
    assert r["resultado"]["destino_principal"] == "Historia_Clinica_Electronica"


def test_sin_clasificacion_el_revisor_debe_indicar_el_tipo():
    from mediflow.revision import DecisionInvalida
    e = hacer_entorno(llm_caido, ext_informe())
    e.procesar(texto="Control.")
    with pytest.raises(DecisionInvalida, match="tipo_documento"):
        e.agente.resolver("DOC-1", {"usuario": "aud.gomez", "rol": "auditor_clinico", "accion": "aprobar"})


# ------------------------------------------------------------------ RN-D9: crítico con baja confianza alerta YA y además va a revisión
def test_rn_d9_critico_con_baja_confianza_alerta_de_inmediato_y_va_a_revision():
    ext = ext_informe("I26.9", "TEP").model_copy(update={"diagnostico_codigo": Campo(valor="I26.9", confianza=0.5)})
    e = hacer_entorno(clas(), ext)
    r = e.procesar(texto=TEXTO_TEP)
    assert r["estado"] == "EN_REVISION_HUMANA"
    tipos = [a["tipo"] for _, a in e.notificador.enviados]
    assert sorted(tipos) == ["alerta_clinica", "revision_humana"]      # alertó sin esperar la revisión
    assert r["resultado"]["notificacion_generada"]["emitida_en_estado"] == "EVALUADO"
    assert e.despachador.entregas == []                                # y NADA llegó a un destino final (RN-E8)


# ------------------------------------------------------------------ RN-P7 / RN-G3, P6 / entrega
def test_p7_canal_caido_usa_el_alterno(entorno_tep=None):
    e = hacer_entorno(clas(prioridad=Prioridad.CRITICO), ext_informe("I26.9", "TEP"),
                      notificador=NotificadorMemoria(canales_caidos={"slack"}))
    r = e.procesar(texto=TEXTO_TEP)
    n = r["resultado"]["notificacion_generada"]
    assert n["canal"] == "email" and n["canales_fallidos"] == [{"canal": "slack", "error": "ConnectionError"}]


def test_p7_ningun_canal_funciona_escala_y_queda_registrado():
    e = hacer_entorno(clas(prioridad=Prioridad.CRITICO), ext_informe("I26.9", "TEP"),
                      notificador=NotificadorMemoria(canales_caidos={"slack", "email"}))
    r = e.procesar(texto=TEXTO_TEP)
    n = r["resultado"]["notificacion_generada"]
    assert n["estado_envio"] == "fallida" and n["escalada_a"] == "siguiente_rol"
    assert any(ev["tipo"] == "alerta_escalada_por_canal_caido" for ev in r["resultado"]["eventos"])


def test_p6_g3_almacenamiento_caido_no_bloquea_el_triaje_ni_la_alerta():
    e = hacer_entorno(clas(prioridad=Prioridad.CRITICO), ext_informe("I26.9", "TEP"),
                      almacen=AlmacenMemoria(fallar=True))
    r = e.procesar(texto=TEXTO_TEP)
    assert r["resultado"]["status_backup"] == "error"
    assert r["resultado"]["nivel_prioridad"] == "Crítico" and len(e.notificador.enviados) == 1


def test_entrega_fallida_se_reintenta_y_el_documento_queda_enrutado():
    e = hacer_entorno(clas(T.RECETA, Dominio.CARDIOLOGIA), ext_receta("losartán"),
                      despachador=DespachadorMemoria(caidos={"Farmacia_Hospitalaria"}))
    r = e.procesar(texto="Receta")
    assert r["estado"] == "ENRUTADO" and r["resultado"]["entrega"]["pendientes"] == ["Farmacia_Hospitalaria"]
    assert r["resultado"]["entrega"]["intentos"] == 4                  # 1 + 3 reintentos
    assert "ENTREGADO" not in [a for _, a in pasos(r)]


def test_escalamiento_rn_f2_lista_alertas_criticas_sin_acuse_vencidas(entorno_tep=None):
    from datetime import datetime, timedelta, timezone
    e = hacer_entorno(clas(prioridad=Prioridad.CRITICO), ext_informe("I26.9", "TEP"))
    e.procesar(texto=TEXTO_TEP)
    ahora = datetime.now(timezone.utc)
    assert e.agente.alertas_vencidas(ahora) == []
    vencidas = e.agente.alertas_vencidas(ahora + timedelta(minutes=16))
    assert [v["documento_id"] for v in vencidas] == ["DOC-1"]
    e.agente.registrar_acuse("DOC-1", "dra.rojas")
    assert e.agente.alertas_vencidas(ahora + timedelta(minutes=60)) == []


def test_urgente_notifica_al_solicitante_sin_acuse_ni_escalamiento_rn_f3():
    e = hacer_entorno(clas(prioridad=Prioridad.URGENTE), ext_informe("R04.2", "Hemoptisis", paciente_id=c("12.345.678-5")))
    r = e.procesar(texto="Paciente con hemoptisis.")
    n = r["resultado"]["notificacion_generada"]
    assert n["nivel"] == "Urgente" and n["estado_acuse"] == "no_aplica"
    assert r["estado"] == "ENTREGADO" and r["pendiente"] is None
