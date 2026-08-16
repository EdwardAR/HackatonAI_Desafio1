# Flujo de información de ClarIA

## Principio rector

Gemini puede mejorar el lenguaje, pero no calcula importes, fechas, porcentajes ni causas. Esos hechos nacen en SQL y se validan antes de llegar al renderer.

```text
CSV futuros → inspección/normalización → PostgreSQL o SQLite
                                          ↓
App / WhatsApp → BFF → FastAPI → Billing Engine (actual + 5 ciclos)
                                  ↓
                           Rules Engine + conciliación
                                  ↓
                 hechos aprobados + Markdown de conceptos
                                  ↓
                    Gemini validado o fallback determinista
                                  ↓
          texto + desglose + acciones + oferta/hand-off/cierre
```

## Aislamiento de identidad

- La landing pública no consulta datos financieros.
- `/dashboard` requiere la bandera efímera del OTP demostrativo.
- El selector del pitch usa `customer_key`, alias y teléfonos sintéticos.
- La skin `/whatsapp` verifica número sintético + código `1234` solo en memoria.
- El BFF conserva la API key en el servidor; el navegador nunca la recibe.

## Decisiones de negocio

- `BillingEngine` calcula el delta entre el recibo actual y el anterior y carga hasta cinco ciclos previos.
- `RulesEngine` sustenta prorrateo, reconexión, fin de descuento, cambio de plan y notas con registros persistidos.
- `ConversationService` clasifica intención/tono, elige acciones y prepara el hand-off.
- Una oferta solo aparece si el análisis está conciliado y una regla explícita la habilita.
- El recordatorio de beneficios solo aparece al cierre de una interacción resuelta.

## CSV pendientes

Los archivos se copian en `data/raw/`. Primero se ejecuta `python -m scripts.import_csv --dry-run` desde `backend`; el comando detecta encoding, separador y encabezados sin escribir en la base. Con los archivos reales presentes se completa y valida el mapeo exacto hacia el modelo normalizado.
