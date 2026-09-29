"""Reglas clínicas puras: RN-D (críticos, NEWS2), RN-E6, RN-A4, RN-M1."""
import pytest

from mediflow.identidad import parsear_identificador, validar_identidad
from mediflow.modelos import EstadoIdentidad as EI, SignosVitales
from mediflow.privacidad import Seudonimizador
from mediflow.reglas_clinicas import CRITICOS, URGENTES, detectar, es_alto_riesgo, evaluar_news2, normalizar_dci


# ---- RN-D1 / RN-D2: conceptos críticos por código y por texto
@pytest.mark.parametrize("codigo", ["I26.0", "I26.9", "BB00.0"])
def test_tep_por_codigo_cie10_y_cie11(codigo):
    assert detectar(CRITICOS, codigo, "").conceptos == ["TEP_AGUDO"]


@pytest.mark.parametrize("texto", ["TEP agudo bilateral", "tromboembolismo pulmonar", "Embolia pulmonar central"])
def test_tep_por_texto_con_sinonimos(texto):
    assert "TEP_AGUDO" in detectar(CRITICOS, None, texto).conceptos


def test_neumotorax_por_codigo_solo_con_signos_de_tension():
    assert detectar(CRITICOS, "J93.0", "neumotórax simple").conceptos == []
    assert detectar(CRITICOS, "J93.0", "neumotórax a tensión con desviación").conceptos == ["NEUMOTORAX_TENSION"]


@pytest.mark.parametrize("texto", ["Se descarta tromboembolismo pulmonar.", "Sin evidencia de TEP.",
                                   "Antecedente de TEP hace 3 años, resuelto."])
def test_mencion_negada_o_antecedente_no_dispara_critico(texto):
    d = detectar(CRITICOS, None, texto)
    assert d.conceptos == [] and d.negados


def test_la_negacion_no_se_arrastra_a_otra_frase():
    assert "TEP_AGUDO" in detectar(CRITICOS, None, "Sin derrame pleural, TEP agudo en rama derecha.").conceptos


def test_urgentes_rn_d6():
    assert "HEMOPTISIS" in detectar(URGENTES, None, "Paciente con hemoptisis desde ayer").conceptos
    assert "EPOC_EXACERBACION" in detectar(URGENTES, "J44.1", "").conceptos


# ---- RN-D3 / RN-D4: NEWS2
@pytest.mark.parametrize("vitales,parametro", [
    (dict(fr=8), "fr"), (dict(fr=25), "fr"), (dict(spo2=91), "spo2"),
    (dict(fc=40), "fc"), (dict(fc=131), "fc"), (dict(pas=90), "pas"), (dict(conciencia_alterada=True), "conciencia"),
])
def test_parametro_individual_critico(vitales, parametro):
    r = evaluar_news2(SignosVitales(**vitales), 60)
    assert r.es_critico and parametro in r.criticos


def test_limites_no_criticos():
    assert not evaluar_news2(SignosVitales(fr=9, spo2=92, fc=41, pas=91), 60).es_critico


def test_news2_total_7_o_mas_es_critico_sin_parametro_individual():
    r = evaluar_news2(SignosVitales(fr=22, fc=115, pas=100, temperatura=39.2, spo2=94, conciencia_alterada=False), 50)
    assert r.criticos == [] and r.total >= 7 and r.es_critico


def test_rn_d4_hipercapnico_usa_escala_2():
    assert evaluar_news2(SignosVitales(spo2=88), 70, hipercapnico=False).es_critico
    r = evaluar_news2(SignosVitales(spo2=88), 70, hipercapnico=True)
    assert not r.es_critico and r.escala_spo2 == 2


@pytest.mark.parametrize("edad,emb,motivo", [(None, False, "edad_ausente"), (12, False, "menor_de_16"), (30, True, "embarazo")])
def test_poblaciones_especiales_news2_no_aplica(edad, emb, motivo):
    r = evaluar_news2(SignosVitales(fr=30), edad, embarazo=emb)
    assert not r.aplica and r.motivo_no_aplica == motivo and not r.es_critico


# ---- RN-E6 / RN-C9
def test_alto_riesgo_y_normalizacion_a_dci():
    assert normalizar_dci("Eliquis 5 mg") == "apixaban"
    assert es_alto_riesgo("apixabán", "oral")
    assert not es_alto_riesgo("losartán", "oral")
    assert es_alto_riesgo("morfina", "IV") and not es_alto_riesgo("morfina", "oral")


# ---- RN-A4: identidad colombiana (sin dígito verificador: solo formato)
@pytest.mark.parametrize("valor", [
    "1020304050", "1.020.304.050", "79123456", "CC 79.123.456", "C.C. 52.345.678", "Cédula de ciudadanía 79123456",
    "TI 1098765432", "RC 1098765432", "CE 123456", "PPT 1234567", "PEP 123456789012345", "Pasaporte AB123456",
])
def test_documentos_colombianos_validos_por_formato(valor):
    assert validar_identidad(valor) is EI.VALIDO_FORMATO


@pytest.mark.parametrize("valor", ["10.234.56K", "12345", "TI 12345", "CC 12345678901", "abc", "CC ", "PPT 1"])
def test_documentos_mal_formados_son_invalidos(valor):
    assert validar_identidad(valor) is EI.INVALIDO


def test_identificador_ausente():
    assert validar_identidad(None) is EI.AUSENTE and validar_identidad("  ") is EI.AUSENTE


def test_parsear_identificador_separa_tipo_y_numero():
    assert parsear_identificador("TI: 1.098.765.432") == ("TI", "1098765432", True)
    assert parsear_identificador("79.123.456") == ("CC", "79123456", False)       # sin prefijo: se asume CC


# ---- RN-M1
def test_seudonimizacion_no_deja_nombre_cedula_fecha_ni_telefono():
    txt = "Paciente: Carlos Mendes, 52 años. CC 1.020.304.050. Fecha: 12/03/2026. Cel: 310 456 7890\nDr. Ana Pérez Soto\nCarlos Mendes con TEP."
    s, mapa = Seudonimizador().seudonimizar(txt)
    for dato in ("Carlos", "Mendes", "1.020.304.050", "12/03/2026", "456 7890", "Ana Pérez"):
        assert dato not in s
    assert "TEP" in s and "52 años" in s                        # lo clínico se conserva
    assert Seudonimizador.reidentificar("[ID_1]", mapa) == "1.020.304.050"


@pytest.mark.parametrize("texto,dato", [
    ("Cédula de ciudadanía 79123456.", "79123456"),              # antes corrompía el texto y filtraba el número
    ("C.C. 52.345.678 del paciente", "52.345.678"),
    ("TI 1098765432", "1098765432"),
    ("PPT 1234567", "1234567"),
    ("Pasaporte AB123456", "AB123456"),
    ("Contacto +57 310 456 7890", "310 456 7890"),
    ("Llamar al 3204567890", "3204567890"),
    ("Fijo 601 234 5678", "234 5678"),
    ("Historia clínica No. 445566", "445566"),
])
def test_seudonimizacion_formatos_colombianos(texto, dato):
    s, _ = Seudonimizador().seudonimizar(texto)
    assert dato not in s and "[" in s


def test_seudonimizacion_no_corrompe_palabras_ni_pierde_el_punto_del_correo():
    s, mapa = Seudonimizador().seudonimizar("Cédula de ciudadanía 79123456. Correo luis@correo.co. Nació el 3 de mayo de 1970.")
    assert "ciudadanía" in s and "udadan" not in mapa.values()
    assert mapa["[EMAIL_1]"] == "luis@correo.co" and "Nació" in s


def test_seudonimizacion_conserva_lo_clinico_con_numeros():
    s, _ = Seudonimizador().seudonimizar("Recibió 5 cc de suero; leucocitos 12.500; SpO2 93 %.")
    assert s == "Recibió 5 cc de suero; leucocitos 12.500; SpO2 93 %."


# ---- NEWS2: tramos (regresiones del hueco entre rangos y de la escala 2 con oxígeno)
def _sv(**kw):
    base = dict(fr=16, spo2=97, fc=70, pas=120, temperatura=37.0, conciencia_alterada=False)
    return SignosVitales(**{**base, **kw})


@pytest.mark.parametrize("kw,total,critico", [
    ({}, 0, False),
    ({"pas": 225}, 3, True),                       # ≥220 es un parámetro rojo
    ({"temperatura": 34.8}, 3, True),              # ≤35.0 es un parámetro rojo
    ({"temperatura": 39.05}, 2, False),            # antes sumaba 0 (hueco entre 39.0 y 39.01)
    ({"temperatura": 38.5}, 1, False),
    ({"spo2": 91.5}, 2, False),                    # antes sumaba 0 (hueco entre 91 y 92)
    ({"spo2": 91}, 3, True),
    ({"fr": 20.5}, 2, False),
])
def test_news2_tramos_y_parametros_individuales(kw, total, critico):
    r = evaluar_news2(_sv(**kw), 50)
    assert r.total == total and r.es_critico is critico


def test_news2_escala_2_con_oxigeno_penaliza_saturacion_alta():
    r = evaluar_news2(_sv(spo2=98, oxigeno_suplementario=True), 60, hipercapnico=True)
    assert r.total == 5 and "spo2" in r.criticos          # 3 (SpO2 ≥97 con O2) + 2 (oxígeno)
    assert evaluar_news2(_sv(spo2=98), 60, hipercapnico=True).total == 0     # al aire, ≥93 no puntúa


def test_reidentificar_tokens_anidados():
    s, mapa = Seudonimizador().seudonimizar("Médico: Dra. Ana Rojas")
    assert "Ana" not in s and "Ana Rojas" in Seudonimizador.reidentificar(s, mapa)
