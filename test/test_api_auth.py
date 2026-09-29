"""La API exige token; usuario y rol salen del token, no del cuerpo de la petición."""
import importlib
import json

import pytest

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
from fastapi.testclient import TestClient      # noqa: E402

TOK_AUDITOR = "token-auditor-clinico-0123456789"
TOK_INTEGRACION = "token-integracion-n8n-0123456789"
USUARIOS = {
    TOK_AUDITOR: {"usuario": "dra.perez", "rol": "auditor_clinico"},
    TOK_INTEGRACION: {"usuario": "n8n", "rol": "integracion"},
}
DOC = {"documento_id": "DOC-1", "contenido": "Control de rutina sin hallazgos.", "formato": "texto",
       "canal_origen": "Consulta_Ambulatoria"}


def _cliente(monkeypatch, usuarios=USUARIOS, desactivada=False):
    monkeypatch.delenv("MEDIFLOW_USUARIOS", raising=False)
    monkeypatch.delenv("MEDIFLOW_AUTH_DESACTIVADA", raising=False)
    monkeypatch.setenv("MEDIFLOW_LLM", "demo")
    if usuarios:
        monkeypatch.setenv("MEDIFLOW_USUARIOS", json.dumps(usuarios))
    if desactivada:
        monkeypatch.setenv("MEDIFLOW_AUTH_DESACTIVADA", "1")
    import mediflow.api as api
    return TestClient(importlib.reload(api).app)


def h(token):
    return {"Authorization": f"Bearer {token}"}


def test_sin_token_o_con_token_falso_es_401(monkeypatch):
    c = _cliente(monkeypatch)
    assert c.post("/documentos", json=DOC).status_code == 401
    assert c.post("/documentos", json=DOC, headers=h("token-inventado-0123456789")).status_code == 401
    assert c.get("/documentos/DOC-1").status_code == 401


def test_sin_usuarios_configurados_falla_cerrado(monkeypatch):
    c = _cliente(monkeypatch, usuarios=None)
    assert c.post("/documentos", json=DOC, headers=h(TOK_INTEGRACION)).status_code == 503


def test_integracion_ingresa_y_consulta_pero_no_resuelve_ni_acusa(monkeypatch):
    c = _cliente(monkeypatch)
    r = c.post("/documentos", json=DOC, headers=h(TOK_INTEGRACION))
    assert r.status_code == 200 and r.json()["estado"] == "EN_REVISION_HUMANA"
    assert c.get("/documentos/DOC-1", headers=h(TOK_INTEGRACION)).status_code == 200
    assert c.post("/documentos/DOC-1/resolver", headers=h(TOK_INTEGRACION),
                  json={"accion": "aprobar"}).status_code == 403
    assert c.post("/documentos/DOC-1/acuse", headers=h(TOK_INTEGRACION), json={"usuario": "x"}).status_code == 403


def test_el_rol_del_body_no_puede_suplantar_al_del_token(monkeypatch):
    c = _cliente(monkeypatch)
    c.post("/documentos", json=DOC, headers=h(TOK_INTEGRACION))
    # Un revisor intenta hacerse pasar por otro usuario y otro rol: se ignoran, manda el token.
    r = c.post("/documentos/DOC-1/resolver", headers=h(TOK_AUDITOR), json={
        "accion": "rechazar", "motivo": "documento ilegible", "usuario": "jefe.falso", "rol": "jefe_guardia"})
    assert r.status_code == 200
    decision = r.json()["resultado"]["decisiones_humanas"][0]
    assert decision["usuario"] == "dra.perez" and decision["rol"] == "auditor_clinico"


def test_modo_desactivado_solo_para_pruebas_locales(monkeypatch):
    c = _cliente(monkeypatch, usuarios=None, desactivada=True)
    assert c.post("/documentos", json=DOC).status_code == 200


def test_pais_distinto_de_colombia_se_rechaza_por_api(monkeypatch):
    c = _cliente(monkeypatch)
    r = c.post("/documentos", json={**DOC, "documento_id": "DOC-MX", "pais_origen": "MX"}, headers=h(TOK_INTEGRACION))
    assert r.json()["estado"] == "RECHAZADO" and r.json()["resultado"]["rechazo"]["codigo"] == "PAIS_NO_SOPORTADO"
