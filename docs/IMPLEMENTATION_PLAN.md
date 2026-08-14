# Plan de implementación

## Estructura objetivo

```text
.
├── app/                    # Frontend React/Vite (dashboard)
├── backend/
│   ├── app/
│   │   ├── api/            # Routers y dependencias HTTP
│   │   ├── core/           # Configuración, seguridad y logs
│   │   ├── models/         # Entidades SQLAlchemy
│   │   ├── schemas/        # Contratos Pydantic
│   │   ├── services/       # Billing, reglas, IA, chat, auditoría
│   │   └── integrations/   # Gemini y Telegram
│   ├── alembic/            # Migraciones
│   ├── scripts/            # Carga de datos demo
│   └── tests/              # Pruebas unitarias e integración
├── docs/                   # Arquitectura, ER y fases
├── scripts/sql/            # Esquema y datos SQL portables
├── docker-compose.yml
└── README.md
```

## Fases

1. **Fundación:** contratos, configuración, modelos, migración y datos demo.
2. **Verdad financiera:** repositorios, Billing Engine, Rules Engine y reconciliación.
3. **Explicación segura:** Gemini con salida estructurada, validador y fallback determinista.
4. **Canales:** REST, chat con historial y webhook Telegram.
5. **Experiencia:** dashboard responsive con resumen, tendencia, evidencia y chat.
6. **Operación:** Docker Compose, health checks, logging, README y pruebas ≥80% del backend de dominio.

## Criterios de aceptación

- Se muestran el ciclo actual y hasta cinco anteriores ordenados.
- Cada causa incluye tipo, impacto, explicación y evidencia consultable.
- Ningún importe de la respuesta proviene de Gemini.
- Sin clave Gemini, el sistema conserva toda la funcionalidad mediante fallback.
- No se exponen campos sensibles en endpoints, logs o UI.
- Los endpoints solicitados y el webhook de Telegram están documentados.
- Backend, pruebas y build del frontend pueden ejecutarse localmente y en contenedores.
