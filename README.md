# ClarIA — Asistente verificable de facturación

ClarIA explica por qué cambió un recibo telefónico usando análisis estructurado, reglas de negocio y evidencia. Gemini 2.5 Flash mejora la redacción, pero nunca calcula importes ni decide causas.

## Qué incluye

- Dashboard React + TypeScript + Tailwind con Recharts y componentes estilo shadcn/ui.
- FastAPI con autenticación, contratos Pydantic, SQLAlchemy y logging JSON.
- Billing Engine con recibo actual, cinco ciclos históricos, deltas y conciliación.
- Rules Engine para fin de descuento, prorrateo, reconexión, cambio de plan y notas.
- Explicador Gemini con validación y fallback determinista.
- Chat persistente, evidencia por causa y auditoría sin PII.
- Webhook de Telegram protegido con secret token.
- PostgreSQL/Supabase, Alembic, scripts SQL, Docker Compose y datos demo.
- Pytest con umbral de cobertura del 80% para el dominio y la API.

La arquitectura completa, ER y estrategia de escalabilidad están en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Las fases y criterios de aceptación están en [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

## Inicio rápido con Docker

Requisitos: Docker Desktop y Docker Compose.

```bash
docker compose up --build
```

Servicios:

- Dashboard: `http://localhost:3000`
- API y Swagger: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`
- PostgreSQL: `localhost:5432`

Cliente demo: `CUST-DEMO-001`. API key local: `demo-claria-key`.

Ejemplo:

```bash
curl -H "X-API-Key: demo-claria-key" http://localhost:8000/analisis/CUST-DEMO-001
```

## Desarrollo local

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -e ".[dev]"
alembic upgrade head
python -m scripts.seed_demo
uvicorn app.main:app --reload
```

Por defecto puede usarse SQLite. Para PostgreSQL copie `backend/.env.example` como `backend/.env` y ajuste `DATABASE_URL`.

### Frontend

```bash
npm install
npm run dev
```

El frontend incluye una experiencia demo autocontenida para jurados. En integración productiva, el navegador debe consumir FastAPI mediante un BFF o gateway que gestione la sesión; no se debe incrustar una API key privilegiada en JavaScript.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado público |
| GET | `/clientes/{customer_key}` | Perfil no sensible |
| GET | `/facturas/{customer_key}` | Recibo actual y detalle |
| GET | `/facturas/{customer_key}/historial` | Hasta seis ciclos |
| GET | `/analisis/{customer_key}` | Variación, causas y evidencia |
| POST | `/explicar-recibo` | Explicación determinista/IA validada |
| POST | `/chat` | Conversación sobre el recibo |
| GET | `/conversaciones/{id}` | Historial de chat |
| POST | `/telegram/webhook` | Entrada privada del bot |

Los endpoints de negocio aceptan `X-API-Key` o `Authorization: Bearer`.

## Garantía contra alucinaciones financieras

```text
PostgreSQL → Billing Engine → Rules Engine → conciliación
                                             ↓
                     hechos autorizados → Gemini (solo frases sin cifras)
                                             ↓
                   validador → renderer con importes calculados
```

Gemini recibe IDs y hechos aprobados. Su salida se rechaza si cambia IDs, contiene números, moneda, porcentajes o excede los límites. El renderer inserta los importes desde `Decimal`. Si Gemini falla o no hay clave, la respuesta determinista conserva la funcionalidad completa.

## Gemini

Defina `GEMINI_API_KEY` en el entorno. El modelo por defecto es `gemini-2.5-flash` y puede cambiarse con `GEMINI_MODEL`. Nunca registre la clave ni la envíe al frontend.

## Telegram

1. Cree el bot con BotFather.
2. Defina `TELEGRAM_BOT_TOKEN` y un valor aleatorio en `TELEGRAM_WEBHOOK_SECRET`.
3. Registre `https://SU-DOMINIO/telegram/webhook` usando el mismo secret token.
4. Para la demo se resuelve `TELEGRAM_DEMO_CUSTOMER_KEY=CUST-DEMO-001`. En producción, reemplace esto por un flujo OTP que vincule `chat_id` con un identificador interno cifrado.

El adaptador nunca busca por teléfono en claro y delega todo el análisis al mismo dominio que usa la Web.

## Pruebas

```bash
cd backend
pytest
```

Las pruebas cubren cálculo y reconciliación, reglas y signos de notas, evidencia, protección de PII, autenticación, endpoints, conversación y fallback explicativo.

```bash
npm run build
```

Valida el frontend para producción.

## Supabase y despliegue

1. Cree un proyecto Supabase y copie el connection string con SSL.
2. Configure `DATABASE_URL=postgresql+psycopg://...` en el runtime.
3. Ejecute `alembic upgrade head` en una tarea de release.
4. Ejecute `python -m scripts.seed_demo` solo en demo/staging.
5. Despliegue la API como contenedor stateless detrás de TLS y un gateway.
6. Despliegue el frontend y configure CORS con su origen exacto.
7. Añada secretos Gemini/Telegram mediante el gestor del proveedor.
8. Configure health checks, backups PITR, retención de auditoría y alertas.

Para Sites, el frontend puede publicarse de forma independiente; FastAPI y PostgreSQL deben desplegarse en un runtime de contenedores. La UI tiene modo demo para que el sitio siga siendo explorable sin exponer credenciales.

## Evolución recomendada

- Cachear análisis por `numero_recibo`, que es inmutable al cerrar el ciclo.
- Precalcular causas con eventos de cierre de factura.
- Añadir Redis/cola para canales y picos de conversación.
- Particionar `facturas` y `detalle_factura` por ciclo.
- Incorporar métricas de conciliación, latencia y tasa de fallback de IA.
- Extraer Billing/Rules únicamente cuando volumen o propiedad de equipos lo requieran.

## Seguridad

- No se exponen DNI, teléfono, cuenta financiera, subscriber key ni hash del teléfono.
- Las consultas SQL son parametrizadas por SQLAlchemy.
- CORS, API key, Telegram secret y secretos externos son configurables.
- Logs y auditoría contienen IDs internos y metadatos filtrados, no PII.
- Para producción use identidad OIDC/JWT con autorización por cliente, rotación de secretos, rate limiting y un WAF.
