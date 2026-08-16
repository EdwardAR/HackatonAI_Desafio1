# PRD — Asistente de Explicación de Recibos (Desafío 1)

Este documento adapta el alcance del desafío a la arquitectura existente de ClarIA. La implementación y sus fuentes se detallan en [ARCHITECTURE.md](./ARCHITECTURE.md) y [FLUJO-INFORMACION.md](./FLUJO-INFORMACION.md).

## Resumen ejecutivo

Un asistente conversacional que explica, en lenguaje simple, por qué el recibo de un cliente varió respecto a meses anteriores — comparando su factura actual contra las 5 previas, identificando la causa exacta (prorrateo, reconexión, fin de descuento, etc.) y ofreciendo una siguiente acción clara. Corre embebido en dos superficies (estilo App Mi Movistar y estilo WhatsApp) sobre un mismo motor de chat.

## Objetivo del prototipo

Pasar el corte de esta fase del hackathon demostrando **en vivo** que el asistente resuelve al menos 2 escenarios reales de variación de recibo, sin inventar ni un solo monto. No es un producto de producción: es un mockup con datos sintéticos y componentes simulados donde el bases del desafío lo permite (autenticación, canales), pero con lógica de negocio real donde importa (cálculo de variación, reglas de cross-selling).

**Plazo:** 2 días. **Equipo:** 4 personas, 1 liderando la parte técnica, resto delegable.

## Usuarios objetivo (para la demo)

Un cliente de Movistar que entra a la App Mi Movistar o le escribe al bot de WhatsApp con dudas sobre por qué su recibo cambió de precio.

## Alcance

Detalle completo de features en [FUNCIONALIDADES.md](./FUNCIONALIDADES.md). Resumen:

**Incluido:**
- Explicación conversacional de variaciones de recibo para 2 escenarios garantizados (prorrateo, reconexión), con un 3ro (fin de descuento) como bonus si el tiempo alcanza.
- Motor de diff determinista sobre PostgreSQL/SQLite, alimentado por datos demo y, cuando estén disponibles, por los CSV mediante el adaptador de importación.
- Retrieval en dos capas: SQL determinista para montos/fechas y búsqueda local sobre Markdown para conceptos/FAQ. Los embeddings pueden añadirse detrás de la misma interfaz sin alterar el contrato.
- Generación de la explicación final vía Gemini (LLM real, no scripteado).
- Next Best Action: pagar / ver detalle / cross-selling restrictivo / derivar a asesor.
- 2 reglas de cross-selling concretas, ancladas al catálogo de ofertas.
- Hand-off con vista de resumen/contexto para el asesor simulado.
- "Efecto Efervescente": recordatorio de beneficios no usados al cerrar una interacción resuelta.
- Autenticación simulada (selector de cliente en la vista App; número de teléfono + verificación mínima en WhatsApp).
- Dos superficies de UI sobre el mismo motor de chat: vista tipo App Mi Movistar y skin tipo WhatsApp.

**Explícitamente fuera de alcance para estos 2 días** (con motivo):
- **Modelo de predicción ML/regresión** del próximo recibo — descartado para no arriesgar el pilar de 0% alucinaciones.
- **Integración real con WhatsApp Business API** — el motor de chat ya queda listo para conectarse después vía un adaptador; no es necesario para demostrar la idea.
- **Vector store administrado** — el prototipo usa Markdown local. La base SQL existente sí se conserva porque garantiza relaciones, conciliación, historial y auditoría.
- **Conexión real a BrainyBill / CRM Amdocs** — se usan los CSV sintéticos entregados; la arquitectura queda preparada para enchufar la fuente real después sin rediseñar el motor.
- **Ver recibos de otras líneas** — solo se contempla como idea de roadmap (múltiples líneas bajo la misma cuenta financiera es legítimo; ver otra cuenta financiera distinta no lo es, por Zero Trust).
- **Automatizar la extracción de PDF/PPTX a texto** — para esta versión, el equipo cura manualmente el contenido de los materiales de Academia Movistar a Markdown. Se menciona como mejora futura en el pitch.

## Requisitos no negociables (vienen de las bases del desafío)

1. **0% de alucinaciones**: ningún monto, fecha o código de cargo puede salir de una llamada al LLM sin haber sido calculado primero por el motor determinista.
2. **Zero Trust simulado**: no se muestra ningún dato sensible sin que el "cliente" esté identificado/autenticado (aunque sea de forma simulada).
3. **Cross-selling restrictivo**: solo se ofrece algo si la consulta se resolvió positivamente y existe una regla de negocio explícita que lo habilite.
4. **Omnicanalidad**: la misma lógica debe funcionar detrás de las dos superficies de UI.

## Qué se demuestra en vivo en el pitch

- Un cliente con una reconexión reciente pregunta por qué le subió el recibo → el bot identifica el cargo exacto, lo explica, ofrece next best action y (si aplica) el cross-selling de la Regla 2.
- Un cliente con un prorrateo por cambio de plan pregunta lo mismo → mismo flujo, otra causa.
- Un caso donde el bot no puede resolver → hand-off con el resumen de contexto visible.
- (Bonus, si hay tiempo) un caso de fin de descuento promocional.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Falla de red/API en pleno pitch | Todo corre local salvo la llamada a Gemini; tener un fallback de "guion" pre-grabado por si la API falla |
| Data de `Ordenes.csv` (cambio de plan) tiene encoding roto y categorías ambiguas | Por eso no es uno de los 2 escenarios garantizados — solo se toca si sobra tiempo |
| Curación manual de MD toma más tiempo del esperado | Priorizar solo los conceptos de los 2 escenarios garantizados primero |
| Cuatro personas, un solo líder técnico | Front-end (las 2 skins) y curación de contenido MD son delegables sin tocar el motor determinista |
