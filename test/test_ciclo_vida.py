"""Reglas RN-I1 a RN-I5 sobre el ciclo de vida."""
import pytest

from mediflow.ciclo_vida import Ciclo, Estado as E, SISTEMA, USUARIO, TransicionInvalida


def ciclo_hasta(*estados):
    c = Ciclo({})
    for e in estados:
        c.ir(e, USUARIO if c.estado is E.EN_REVISION_HUMANA else SISTEMA, "test")
    return c


def test_camino_feliz_completo():
    c = ciclo_hasta(E.RECIBIDO, E.VALIDADO, E.CLASIFICADO, E.EXTRAIDO, E.EVALUADO, E.ENRUTADO, E.ENTREGADO)
    assert c.estado is E.ENTREGADO


def test_rn_i2_no_se_saltan_etapas():
    c = ciclo_hasta(E.RECIBIDO, E.VALIDADO)
    with pytest.raises(TransicionInvalida):
        c.ir(E.EXTRAIDO, SISTEMA, "salto")             # se salta CLASIFICADO
    with pytest.raises(TransicionInvalida):
        c.ir(E.ENRUTADO, SISTEMA, "salto")


def test_rn_i2_enrutar_exige_haber_pasado_por_evaluado():
    # Camino de fallo técnico → revisión → resuelto: RESUELTO→ENRUTADO directo violaría RN-I2
    c = ciclo_hasta(E.RECIBIDO, E.VALIDADO, E.FALLO_TECNICO, E.EN_REVISION_HUMANA, E.RESUELTO)
    with pytest.raises(TransicionInvalida, match="RN-I2"):
        c.ir(E.ENRUTADO, SISTEMA, "sin evaluar")
    c.ir(E.EVALUADO, SISTEMA, "reglas re-ejecutadas")
    c.ir(E.ENRUTADO, SISTEMA, "ok")


@pytest.mark.parametrize("final", [E.ENTREGADO, E.RECHAZADO])
def test_rn_i1_estados_finales_inmutables(final):
    c = ciclo_hasta(E.RECIBIDO, E.RECHAZADO) if final is E.RECHAZADO else \
        ciclo_hasta(E.RECIBIDO, E.VALIDADO, E.CLASIFICADO, E.EXTRAIDO, E.EVALUADO, E.ENRUTADO, E.ENTREGADO)
    for destino in E:
        with pytest.raises(TransicionInvalida):
            c.ir(destino, SISTEMA, "intento")


def test_rn_i3_cada_transicion_registra_ts_actor_y_motivo():
    c = ciclo_hasta(E.RECIBIDO, E.VALIDADO)
    ultima = c.nuevas[-1]
    assert ultima["ts"] and ultima["actor"] == SISTEMA and ultima["motivo"] == "test"
    assert ultima["de"] == "RECIBIDO" and ultima["a"] == "VALIDADO"
    with pytest.raises(TransicionInvalida, match="RN-I3"):
        c.ir(E.CLASIFICADO, SISTEMA, "  ")


def test_rn_i4_desde_revision_humana_solo_mueve_un_usuario():
    c = ciclo_hasta(E.RECIBIDO, E.VALIDADO, E.CLASIFICADO, E.EXTRAIDO, E.EVALUADO, E.EN_REVISION_HUMANA)
    with pytest.raises(TransicionInvalida, match="RN-I4"):
        c.ir(E.RESUELTO, SISTEMA, "regla automática")
    c.ir(E.RESUELTO, USUARIO, "aprobado")


def test_rn_i5_el_sistema_solo_rechaza_desde_recibido():
    c = ciclo_hasta(E.RECIBIDO, E.VALIDADO)
    with pytest.raises(TransicionInvalida):
        c.ir(E.RECHAZADO, SISTEMA, "después de validar nunca se rechaza")
    c2 = ciclo_hasta(E.RECIBIDO, E.VALIDADO, E.CLASIFICADO, E.EXTRAIDO, E.EVALUADO, E.EN_REVISION_HUMANA)
    with pytest.raises(TransicionInvalida):
        c2.ir(E.RECHAZADO, SISTEMA, "el sistema no rechaza en revisión")
    c2.ir(E.RECHAZADO, USUARIO, "rechazo de un revisor")


def test_documento_nuevo_solo_inicia_en_recibido():
    with pytest.raises(TransicionInvalida):
        Ciclo({}).ir(E.VALIDADO, SISTEMA, "x")
