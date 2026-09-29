"""Casos de aceptación de la sección 9 del documento, ejecutados sobre el grafo LangGraph completo."""
import pytest

from conftest import (TEXTO_TEP, c, clas, ext_informe, ext_orden, ext_receta, hacer_entorno, request)
from mediflow.modelos import Campo, Dominio, Extraccion, Prioridad, SignosVitales, TipoDocumento as T


def estados(res):
    return [h["a"] for h in res["resultado"]["historial"]]


# ------------------------------------------------------------------ Caso 1 (RN-D1, A4, Q4)
def test_caso_1_tep_sin_identificador(entorno_tep):
    r = entorno_tep.procesar(texto=TEXTO_TEP)
    res = r["resultado"]
    assert res["nivel_prioridad"] == "Crítico"
    assert res["destino_principal"] == "Cola_Emergencia_Medica"
    assert res["requiere_auditoria_humana"] is False
    assert res["identidad"] == "ausente"
    # RN-A4: la falta de identificador retiene SOLO la entrega a la HCE
    assert res["destinos_retenidos"] == ["Historia_Clinica_Electronica"]
    assert [d for d, _ in entorno_tep.despachador.entregas] == ["Cola_Emergencia_Medica"]
    # RN-Q4: la alerta no lleva datos del paciente
    (canal, alerta), = entorno_tep.notificador.enviados
    assert set(alerta) == {"documento_id", "tipo", "nivel", "destinatario", "enlace"}
    assert "Juan" not in str(alerta) and "Pérez" not in str(alerta)
    # RN-J7: un crítico no se cierra sin acuse → el grafo espera
    assert r["pendiente"]["tipo"] == "acuse" and r["estado"] == "ENRUTADO"


def test_caso_1_acuse_y_rn_q5(entorno_tep):
    entorno_tep.procesar(texto=TEXTO_TEP)
    from mediflow.revision import DecisionInvalida
    with pytest.raises(DecisionInvalida, match="RN-Q5"):
        entorno_tep.agente.registrar_acuse("DOC-1", "svc-bot")
    r = entorno_tep.agente.registrar_acuse("DOC-1", "dra.rojas")
    assert r["resultado"]["notificacion_generada"]["estado_acuse"] == "recibido"
    assert r["estado"] == "ENRUTADO"           # sigue ENRUTADO: la HCE quedó retenida por identificador ausente


def test_critico_con_identificador_valido_se_entrega_tras_el_acuse():
    e = hacer_entorno(clas(prioridad=Prioridad.CRITICO),
                      ext_informe("I26.9", "TEP", "TEP agudo", paciente_id=c("12.345.678-5")))
    r = e.procesar(texto=TEXTO_TEP)
    assert r["pendiente"]["tipo"] == "acuse"
    r = e.agente.registrar_acuse("DOC-1", "dra.rojas")
    assert r["estado"] == "ENTREGADO" and r["pendiente"] is None
    assert {d for d, _ in e.despachador.entregas} == {"Cola_Emergencia_Medica", "Historia_Clinica_Electronica"}


# ------------------------------------------------------------------ Casos 2 y 3 (RN-E2, E6)
def test_caso_2_receta_de_mantencion_va_a_farmacia_como_rutina():
    e = hacer_entorno(clas(T.RECETA, Dominio.CARDIOLOGIA), ext_receta("losartán"))
    r = e.procesar(texto="Receta: losartán 50 mg cada 12 horas por 30 días")
    assert r["resultado"]["nivel_prioridad"] == "Rutina"
    assert r["resultado"]["destino_principal"] == "Farmacia_Hospitalaria"
    assert r["estado"] == "ENTREGADO" and not e.notificador.enviados      # RN-Q3: rutina no notifica


def test_caso_3_apixaban_alto_riesgo_con_doble_verificacion():
    e = hacer_entorno(clas(T.RECETA, Dominio.CARDIOLOGIA), ext_receta("apixabán"))
    res = e.procesar(texto="Receta: apixabán 5 mg")["resultado"]
    assert res["alto_riesgo"] is True
    assert res["banderas"]["verificaciones_requeridas"] == 2
    assert res["destino_principal"] == "Farmacia_Hospitalaria"


# ------------------------------------------------------------------ Casos 4 y 5 (RN-E4, E5)
def test_caso_4_orden_sin_justificacion_queda_documentacion_incompleta():
    ext = Extraccion(**{**ext_orden().model_dump(), "sintomas": Campo(), "hallazgos_previos": Campo()})
    e = hacer_entorno(clas(T.ORDEN, Dominio.CARDIOLOGIA), ext)
    res = e.procesar(texto="Orden de ecocardiograma de estrés", canal="Consulta_Ambulatoria",
                     cobertura_paciente="isapre")["resultado"]
    assert res["destino_principal"] == "Auditoria_Autorizaciones"
    assert res["banderas"]["documentacion_incompleta"] is True
    assert set(res["banderas"]["faltantes"]) == {"sintomas", "hallazgos_previos"}


def test_caso_5_cateterismo_desde_urgencias_no_pasa_por_auditoria():
    e = hacer_entorno(clas(T.ORDEN, Dominio.CARDIOLOGIA), ext_orden())
    res = e.procesar(texto="Orden de cateterismo", canal="Guardia_Emergencias")["resultado"]
    assert res["destino_principal"] == "Cola_Emergencia_Medica"
    assert "Auditoria_Autorizaciones" not in [res["destino_principal"], *res["destinos_secundarios"]]


# ------------------------------------------------------------------ Caso 6 (RN-A4, C3) + flujo de revisión (RN-I4, J)
@pytest.fixture
def entorno_run_invalido():
    # Cédula colombiana con error de OCR (una letra en vez de dígito): RN-A4 -> INVALIDO
    # (no hay dígito verificador: lo único que la invalida es no calzar con el formato \d{6,10}).
    ext = ext_informe(paciente_id=Campo(valor="10.234.56K", confianza=0.6))
    return hacer_entorno(clas(), ext)


def test_caso_6_run_invalido_y_baja_confianza_va_a_revision_con_campos_dudosos(entorno_run_invalido):
    e = entorno_run_invalido
    r = e.procesar()
    assert r["estado"] == "EN_REVISION_HUMANA" and r["pendiente"]["tipo"] == "revision_humana"
    assert "identidad_invalida" in r["pendiente"]["motivos"]
    assert "paciente_id" in [d["campo"] for d in r["pendiente"]["campos_dudosos"]]
    assert e.despachador.entregas == []                     # RN-E8: nada llega a un destino final
    assert any("auditoria_humana" in ruta for ruta in e.almacen.rutas())


def test_rn_i4_bloqueado_hasta_que_un_humano_resuelve(entorno_run_invalido):
    e = entorno_run_invalido
    e.procesar()
    e.procesar()                                            # reenviar (RN-O1) no lo mueve
    assert e.agente.estado("DOC-1")["estado"] == "EN_REVISION_HUMANA"
    assert e.despachador.entregas == []


def test_revision_corregir_re_ejecuta_reglas_y_entrega(entorno_run_invalido):
    e = entorno_run_invalido
    e.procesar()
    r = e.agente.resolver("DOC-1", {"usuario": "aud.gomez", "rol": "auditor_clinico", "accion": "corregir",
                                    "correcciones": {"paciente_id": "10.234.569"}})
    res = r["resultado"]
    assert r["estado"] == "ENTREGADO" and res["requiere_auditoria_humana"] is True
    assert res["extraccion"]["paciente_id"]["valor"] == "10.234.569"
    assert res["correcciones"] == [{"campo": "paciente_id", "extraido": "10.234.56K", "corregido": "10.234.569"}]   # RN-J8
    assert res["decisiones_humanas"][0]["usuario"] == "aud.gomez"                                                     # RN-G4
    pasos = estados(r)
    assert pasos.index("EN_REVISION_HUMANA") < pasos.index("RESUELTO") < pasos.index("ENRUTADO")
    resuelto = next(h for h in res["historial"] if h["a"] == "RESUELTO")
    assert resuelto["actor"] == "usuario"


def test_revisor_rechaza_con_motivo_y_queda_final(entorno_run_invalido):
    e = entorno_run_invalido
    e.procesar()
    r = e.agente.resolver("DOC-1", {"usuario": "aud.gomez", "rol": "auditor_clinico", "accion": "rechazar",
                                    "motivo": "documento de otro paciente"})
    assert r["estado"] == "RECHAZADO"
    assert any("rechazados/DOC-1" in ruta for ruta in e.almacen.rutas())


@pytest.mark.parametrize("decision,texto", [
    ({"usuario": "admin", "rol": "administrador_sistema", "accion": "aprobar"}, "RN-K2"),
    ({"usuario": "svc-agente", "rol": "auditor_clinico", "accion": "aprobar"}, "RN-K5"),
    ({"usuario": "aud.gomez", "rol": "auditor_clinico", "accion": "rechazar"}, "RN-J3"),
    ({"usuario": "aud.gomez", "rol": "auditor_clinico", "accion": "aprobar", "prioridad_nueva": "Rutina"}, None),
])
def test_decisiones_invalidas_no_alteran_el_documento(entorno_run_invalido, decision, texto):
    from mediflow.revision import DecisionInvalida
    e = entorno_run_invalido
    e.procesar()
    if texto is None:            # bajar prioridad de un Rutina no es "bajar": es válido
        assert e.agente.resolver("DOC-1", decision)["estado"] in {"ENTREGADO", "ENRUTADO"}
        return
    with pytest.raises(DecisionInvalida, match=texto):
        e.agente.resolver("DOC-1", decision)
    assert e.agente.estado("DOC-1")["estado"] == "EN_REVISION_HUMANA"


def test_rn_j5_bajar_un_critico_exige_rol_clinico_con_justificacion():
    from mediflow.revision import DecisionInvalida
    ext = ext_informe("I26.9", "TEP", "TEP").model_copy(update={"diagnostico_texto": Campo(valor="TEP", confianza=0.5)})
    e = hacer_entorno(clas(prioridad=Prioridad.CRITICO), ext)
    e.procesar(texto=TEXTO_TEP)
    base = {"usuario": "jef.diaz", "rol": "jefe_guardia", "accion": "aprobar", "prioridad_nueva": "Urgente"}
    with pytest.raises(DecisionInvalida, match="RN-J5"):
        e.agente.resolver("DOC-1", base)
    with pytest.raises(DecisionInvalida, match="RN-J5"):
        e.agente.resolver("DOC-1", {**base, "rol": "auditor_clinico"})          # sin justificación
    r = e.agente.resolver("DOC-1", {**base, "rol": "auditor_clinico", "justificacion": "TEP subsegmentario, paciente estable"})
    assert r["resultado"]["nivel_prioridad"] == "Urgente"


# ------------------------------------------------------------------ Casos 8 y 9 (RN-D4, D8)
def test_caso_8_spo2_88_en_hipercapnico_no_es_critico():
    ext = ext_informe(signos_vitales=SignosVitales(spo2=88), hipercapnico_documentado=True)
    res = hacer_entorno(clas(), ext).procesar(texto="EPOC hipercápnico documentado. SpO2 88%")["resultado"]
    assert res["nivel_prioridad"] == "Rutina" and res["news2"]["escala_spo2"] == 2


def test_caso_8b_mismo_valor_sin_hipercapnia_si_es_critico():
    ext = ext_informe(signos_vitales=SignosVitales(spo2=88))
    res = hacer_entorno(clas(), ext).procesar(texto="SpO2 88%")["resultado"]
    assert res["nivel_prioridad"] == "Crítico"


def test_caso_9_el_llm_propone_rutina_y_la_regla_eleva_a_critico():
    e = hacer_entorno(clas(prioridad=Prioridad.RUTINA), ext_informe("I26.9", "Tromboembolismo pulmonar"))
    res = e.procesar(texto="Informe sin palabras clave")["resultado"]
    assert res["nivel_prioridad"] == "Crítico"
    assert {"regla": "RN-D8", "llm_propuso": "Rutina", "regla_eleva_a": "Crítico"} in res["reglas_disparadas"]


def test_rn_d8_las_reglas_nunca_bajan_lo_que_propuso_el_llm():
    e = hacer_entorno(clas(prioridad=Prioridad.CRITICO), ext_informe("J18.9"))
    assert e.procesar(texto="Neumonía leve")["resultado"]["nivel_prioridad"] == "Crítico"


# ------------------------------------------------------------------ Casos 10, 11 (RN-D2, A3)
def test_caso_10_pack_colombia_con_cie11_bb00_0():
    e = hacer_entorno(clas(), ext_informe("BB00.0", "Embolia pulmonar"))
    res = e.procesar(texto="Informe", pais_origen="CO")["resultado"]
    assert res["nivel_prioridad"] == "Crítico" and res["pais_origen"] == "CO"


def test_caso_11_sin_pais_origen_usa_el_de_la_instalacion():
    assert hacer_entorno(clas(), ext_informe()).procesar()["resultado"]["pais_origen"] == "CO"


# ------------------------------------------------------------------ Caso 12 (RN-O1, O2, O3)
def test_caso_12_mismo_documento_dos_veces_un_procesamiento_una_alerta(entorno_tep):
    a = entorno_tep.procesar(texto=TEXTO_TEP)
    b = entorno_tep.procesar(texto=TEXTO_TEP)
    assert len(entorno_tep.llamadas["clasificar"]) == 1 and len(entorno_tep.notificador.enviados) == 1
    assert a["resultado"]["historial"] == b["resultado"]["historial"]


def test_rn_o2_version_nueva_no_repite_la_alerta_si_no_sube_de_nivel(entorno_tep):
    entorno_tep.procesar(texto=TEXTO_TEP)
    r = entorno_tep.procesar(texto=TEXTO_TEP + " Addendum.")
    assert r["version"] == 2 and len(entorno_tep.notificador.enviados) == 1


def test_rn_o3_mismo_contenido_con_otro_id_se_procesa_sin_duplicar_la_alerta(entorno_tep):
    entorno_tep.procesar(doc_id="A", texto=TEXTO_TEP)
    r = entorno_tep.procesar(doc_id="B", texto=TEXTO_TEP)
    assert r["resultado"]["posible_duplicado_de"] == "A"
    assert len(entorno_tep.llamadas["clasificar"]) == 2 and len(entorno_tep.notificador.enviados) == 1


# ------------------------------------------------------------------ Caso 13 (RN-M1)
def test_caso_13_al_llm_solo_llegan_tokens_y_el_resultado_conserva_los_datos_reales():
    texto = "Informe de imágenes.\nPaciente: Juan Pérez Soto, 58 años.\nCédula 12.345.678.\nFecha: 12/03/2026."
    e = hacer_entorno(clas(), ext_informe(paciente_id=c("[ID_1]")))
    res = e.procesar(texto=texto)["resultado"]
    for llamada in e.llamadas["clasificar"] + e.llamadas["extraer"]:
        enviado = llamada["texto"]
        assert all(dato not in enviado for dato in ("Juan", "Pérez", "12.345.678", "12/03/2026"))
        assert "[PACIENTE_1]" in enviado and "[ID_1]" in enviado
    assert res["extraccion"]["paciente_nombre"]["valor"] == "Juan Pérez Soto"      # re-identificado en local
    assert res["extraccion"]["paciente_id"]["valor"] == "12.345.678"
    # Los documentos colombianos no llevan dígito verificador: solo se valida formato,
    # así que el máximo posible es "valido_formato".
    assert res["identidad"] == "valido_formato"


# ------------------------------------------------------------------ Colombia: autorización, país único
def _orden(**kw):
    e = hacer_entorno(clas(T.ORDEN, Dominio.CARDIOLOGIA), ext_orden())
    return e.procesar(texto="Orden ambulatoria de cateterismo", **kw)


def test_orden_ambulatoria_va_a_auditoria_de_autorizaciones_del_asegurador():
    res = _orden()["resultado"]
    assert res["destino_principal"] == "Auditoria_Autorizaciones"
    assert "motivo" not in res["banderas"] and "verificar_referencia" not in res["banderas"]


@pytest.mark.parametrize("pais", ["UY", "CL", "MX", "CR", "HN", "US"])
def test_pais_distinto_de_colombia_se_rechaza(pais):
    r = _orden(pais_origen=pais)
    assert r["estado"] == "RECHAZADO" and r["resultado"]["rechazo"]["codigo"] == "PAIS_NO_SOPORTADO"


def test_pais_origen_en_minusculas_co_se_acepta():
    assert _orden(pais_origen="co")["resultado"]["pais_origen"] == "CO"


# ------------------------------------------------------------------ Validación (RN-A1, A2, A9, O5, I5)
@pytest.mark.parametrize("cambio,codigo", [
    ({"formato": "docx"}, "FORMATO_NO_SOPORTADO"), ({"documento_id": ""}, "ID_AUSENTE"),
    ({"canal_origen": "otro"}, "CANAL_ORIGEN_INVALIDO"), ({"contenido": ""}, "CONTENIDO_VACIO"),
    ({"tamano_bytes": 10**9}, "TAMANO_EXCEDIDO"),
])
def test_rechazo_solo_desde_recibido_con_codigo_explicito(cambio, codigo):
    e = hacer_entorno(clas(), ext_informe())
    r = e.agente.procesar({**request(), **cambio})
    assert r["estado"] == "RECHAZADO" and r["resultado"]["rechazo"]["codigo"] == codigo
    assert [h["de"] for h in r["resultado"]["historial"]][-1] == "RECIBIDO"      # RN-I5
    assert e.llamadas["clasificar"] == []                                        # no se gastó una llamada al LLM


def test_rn_i1_i3_historial_completo_del_camino_feliz():
    e = hacer_entorno(clas(), ext_informe(paciente_id=c("12.345.678-5")))
    res = e.procesar()["resultado"]
    assert estados({"resultado": res}) == ["RECIBIDO", "VALIDADO", "CLASIFICADO", "EXTRAIDO", "EVALUADO", "ENRUTADO", "ENTREGADO"]
    assert all(h["ts"] and h["actor"] and h["motivo"] for h in res["historial"])
