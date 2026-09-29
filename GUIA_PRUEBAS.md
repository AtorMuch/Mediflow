# Guía de pruebas — MediFlow backend (Colombia)

> Esta instalación es **exclusiva para Colombia**: un documento con `pais_origen` distinto de `CO` se rechaza
> (`PAIS_NO_SOPORTADO`). Identidad: CC, TI, RC, CE, PPT, PEP y pasaporte (solo se valida el formato; ninguno
> tiene dígito verificador). PDF e imágenes **todavía no se procesan** (falta OCR/visión): van a revisión humana.

## 1. Instalar y correr lo que ya existe (sin ninguna credencial)

```bash
cd mediflow
python3 -m venv .venv && source .venv/bin/activate      # o el equivalente en tu SO
pip install -e ".[api,slack]"        # instala también fastapi, uvicorn, slack-bolt, slack-sdk
pip install pytest httpx
python3 -m pytest -q                 # deberían pasar 155 tests, sin llaves ni tokens
```

Estos 155 tests **no** llaman a OpenAI ni a Slack: usan dobles de prueba
(`Cadenas` falsas en `tests/conftest.py`, `NotificadorMemoria`). Son los que
validan las reglas de negocio (NEWS2, enrutamiento, RN-*). Corre esto primero,
siempre, antes de tocar credenciales — si algo se rompe aquí, el problema es
de lógica, no de configuración externa.

Después, prueba el servidor HTTP en modo demo (sin OpenAI ni Slack reales). **La API exige token**
(el usuario y el rol salen del token, no del cuerpo de la petición). Para pruebas locales, crea uno:

```bash
export MEDIFLOW_TOKEN=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
export MEDIFLOW_USUARIOS="{\"$MEDIFLOW_TOKEN\": {\"usuario\": \"dra.perez\", \"rol\": \"auditor_clinico\"}}"
# Roles: auditor_clinico, farmaceutico, auditor_autorizaciones, jefe_guardia (resuelven documentos)
#        integracion (cuenta de servicio, p. ej. n8n: ingresa y consulta, NO resuelve ni acusa)
# Solo para probar sin token (nunca en un servidor real):  export MEDIFLOW_AUTH_DESACTIVADA=1
```

```bash
uvicorn mediflow.api:app --reload --port 8000
```

En otra terminal:

```bash
curl -X POST http://localhost:8000/documentos \
  -H "Content-Type: application/json" -H "Authorization: Bearer $MEDIFLOW_TOKEN" \
  -d '{"documento_id":"DOC-1","contenido":"Control de rutina sin hallazgos.","formato":"texto","canal_origen":"Consulta_Ambulatoria"}'
```

Vas a ver `"estado": "EN_REVISION_HUMANA"` porque en modo demo el
"clasificador" es un relleno que siempre devuelve `No_Clasificable` con
confianza 0 (a propósito: así nunca vas a pensar que es un LLM real
funcionando cuando en realidad no lo es). Esto confirma que el servidor, el
grafo y el ciclo de vida funcionan de punta a punta. El paso 2 reemplaza ese
relleno por un LLM real.

---

## 2. Conectar la API de OpenAI

`llm.py` ya tiene la función que arma las dos cadenas (clasificador +
extractor) con salida estructurada:

```python
def crear_cadenas_openai(modelo: str = "gpt-4o-mini", temperatura: float = 0.0, **kwargs) -> Cadenas
```

Lo único que falta de tu lado es la variable de entorno con la clave — no hay
que tocar código:

```bash
export OPENAI_API_KEY="sk-...."          # la generas en platform.openai.com/api-keys
export MEDIFLOW_LLM=openai               # le dice a api.py que use el LLM real, no el relleno
uvicorn mediflow.api:app --reload --port 8000
```

`langchain-openai` lee `OPENAI_API_KEY` del entorno automaticamente (no hace
falta pasarla a mano). Si quieres otro modelo (por ejemplo uno más barato para
desarrollo), es el primer argumento:

```python
# en api.py, dentro de _construir_dependencias():
cadenas = crear_cadenas_openai(modelo="gpt-4o-mini")
```

Repite el mismo `curl` del paso 1 con un texto clínico real (por ejemplo el
`TEXTO_TEP` que usan los tests, en `tests/conftest.py`) y deberías ver una
clasificación y extracción de verdad, no el relleno.

**Antes de gastar en producción:** corre
`python3 -m pytest -q tests/test_llm.py` — ese archivo sí valida el prompt
(anti-inyección, seudonimización) sin gastar tokens, porque intercepta la
llamada al modelo.

---

## 3. Conectar Slack por OAuth (no un webhook)

Esto tiene una parte que haces una sola vez en el sitio de Slack, y otra que
es correr el servidor.

### 3.1 Crear la app en Slack (una sola vez)

1. Ve a <https://api.slack.com/apps> → **Create New App** → **From scratch**.
2. Ponle nombre (p. ej. "MediFlow") y elige el workspace de prueba.
3. En **OAuth & Permissions**, sección **Scopes → Bot Token Scopes**, agrega:
   - `chat:write`
   - `channels:read`
   - `groups:read` (si vas a publicar en canales privados)
4. En la misma pantalla, **Redirect URLs** → agrega
   `https://TU_DOMINIO/slack/oauth_redirect` (para probar en local con un
   túnel, ver 3.2).
5. Guarda tres valores de **Basic Information**: `Client ID`, `Client Secret`,
   `Signing Secret`.
6. Crea los canales en el workspace de prueba y suma el bot a cada uno
   (`/invite @MediFlow` en cada canal, o dale `channels:join` como scope
   adicional si quieres que se auto-invite a canales públicos):
   - `#urgencias-criticas`
   - `#mediflow-avisos`
   - `#mediflow-revision`
   - `#mediflow-ops`

### 3.2 Exponer tu servidor local (para que Slack te pueda redirigir)

Slack necesita golpear una URL pública. Para probar en tu máquina, usa un
túnel (`ngrok`, `cloudflared`, lo que tengas):

```bash
ngrok http 8000
# copia la URL https://xxxx.ngrok-free.app que te da
```

Esa URL + `/slack/oauth_redirect` es la que pegas en **Redirect URLs** del
paso 3.1.4.

### 3.3 Variables de entorno y arranque

```bash
export SLACK_CLIENT_ID="..."
export SLACK_CLIENT_SECRET="..."
export SLACK_SIGNING_SECRET="..."
export SLACK_REDIRECT_URI="https://xxxx.ngrok-free.app/slack/oauth_redirect"

# opcional: si tus canales de prueba tienen otro nombre
export SLACK_CANAL_CRITICO="#urgencias-criticas"
export SLACK_CANAL_URGENTE="#mediflow-avisos"
export SLACK_CANAL_REVISION="#mediflow-revision"
export SLACK_CANAL_OPS="#mediflow-ops"

uvicorn mediflow.api:app --reload --port 8000
```

En los logs de arranque deberías ver `Slack OAuth configurado` en vez de
`Slack OAuth deshabilitado`.

### 3.4 Autorizar el bot en el workspace (una vez por workspace)

Abre en el navegador:

```
https://xxxx.ngrok-free.app/slack/install
```

Te lleva al diálogo estándar de Slack ("MediFlow quiere acceder a tu
workspace..."). Aceptas, Slack te redirige de vuelta a
`/slack/oauth_redirect`, y `slack_bolt` guarda el token del bot en
`./.slack_installations/` (una carpeta con archivos JSON — es el
`FileInstallationStore` que ves en `integraciones/slack_oauth.py`; para más
de un workspace en producción, esa es la única clase que habría que
cambiar por una que guarde en base de datos).

Con eso instalado una vez, toma el `team_id` (aparece en la URL de tu
workspace de Slack, algo como `T02ABCDEF`, o mira el archivo que quedó en
`.slack_installations/`) y configura:

```bash
export MEDIFLOW_SLACK_TEAM_ID="T02ABCDEF"
```

Reinicia el servidor. Ahora `_construir_notificador()` en `api.py` arma un
`NotificadorSlack` de verdad en lugar del `NotificadorMemoria` de respaldo.

### 3.5 Probar que un mensaje llega de verdad

```bash
curl -X POST http://localhost:8000/documentos \
  -H "Content-Type: application/json" -H "Authorization: Bearer $MEDIFLOW_TOKEN" \
  -d '{"documento_id":"DOC-SLACK-1","contenido":"Paciente con disnea súbita, hallazgos compatibles con tromboembolismo pulmonar.","formato":"texto","canal_origen":"Guardia_Emergencias"}'
```

Deberías ver, casi al instante, un mensaje en `#urgencias-criticas` (alerta
clínica) — y si ese mismo caso también cae en revisión humana (poca
confianza, campo dudoso, etc.), otro mensaje en `#mediflow-revision`. Si en
cambio simulás una falla técnica del LLM (por ejemplo, apaga
`OPENAI_API_KEY` a mitad de prueba o fuerza un timeout), el aviso va a
`#mediflow-ops`.

### 3.6 Probar el adaptador sin gastar mensajes reales de Slack

```bash
python3 -m pytest -q tests/test_integracion_slack.py
```

Ese archivo prueba el enrutamiento (destinatario → canal), el manejo de
errores (`ConnectionError` cuando Slack no está instalado o el canal no
existe) y que nunca se manda texto del paciente — todo con un `WebClient`
falso, sin red. Es el lugar para agregar casos nuevos antes de probarlos
contra Slack real.

---

## Resumen de variables de entorno

| Variable | Para qué | Obligatoria si... |
|---|---|---|
| `OPENAI_API_KEY` | LangChain llama a OpenAI | `MEDIFLOW_LLM=openai` |
| `MEDIFLOW_LLM` | `demo` (relleno) u `openai` (real) | siempre, default `demo` |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` / `SLACK_SIGNING_SECRET` | OAuth de Slack | quieres Slack real |
| `SLACK_REDIRECT_URI` | debe calzar con la Redirect URL en api.slack.com | ídem |
| `MEDIFLOW_SLACK_TEAM_ID` | qué workspace instalado usar al enviar | ídem |
| `MEDIFLOW_USUARIOS` | JSON `{"token": {"usuario": ..., "rol": ...}}` para autenticar la API | siempre (salvo `MEDIFLOW_AUTH_DESACTIVADA=1`, solo local) |
| `MEDIFLOW_SMTP_HOST` / `_PORT` / `_USER` / `_PASS` / `_FROM` | canal alterno de correo (RN-P7) | quieres respaldo por correo |
| `MEDIFLOW_EMAIL_DESTINOS` | JSON rol → correo, p. ej. `{"jefe_de_guardia": "guardia@clinica.co"}` | ídem |
| `SLACK_CANAL_*` | override de los 4 canales por defecto | opcional |
| `MEDIFLOW_SLACK_INSTALL_DIR` | dónde guarda el token del bot | opcional (default `./.slack_installations`) |

Ninguna de estas hace falta para correr `pytest` — solo para levantar
`uvicorn` contra servicios reales.
