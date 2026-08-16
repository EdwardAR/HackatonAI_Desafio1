# Funcionalidades y alcance

Desglose feature por feature de lo que entra en el prototipo. Prioridad `P0` = sin esto no hay demo, `P1` = suma mucho si hay tiempo, `P2` = mencionar en el pitch como roadmap, no construir.

## P0 — Núcleo (sin esto no hay demo)

### 1. Identificación simulada del cliente
- **Qué hace:** al entrar a cualquiera de las 2 superficies, se establece qué cuenta financiera está "hablando" con el bot.
- **App Mi Movistar (skin):** selector de cliente — elegir entre varias cuentas de `PLANTA CLIENTES.csv` (`COD_CLIENTE`/`FINANCIAL_ACCOUNT`), simulando que la app ya autenticó al usuario antes de llegar al bot.
- **WhatsApp (skin):** un número completamente sintético identifica el caso y el código demo `1234` habilita el chat. No se expone `telefono_hash`, DNI ni PII.
- **Criterio de aceptación:** una vez identificado, todo el resto de la conversación queda atado a esa cuenta financiera y no se cruza con datos de otra.
- **Dataset:** `PLANTA CLIENTES.csv`.

### 2. Motor de diff determinista (Diff Engine)
- **Qué hace:** dado un `customer_key`, trae de SQL el recibo actual + 5 anteriores, compara detalles y reconcilia la variación. Los CSV futuros se normalizan a estas mismas tablas.
- **Criterio de aceptación:** el resultado es 100% trazable a filas reales del CSV — cero cálculos "adivinados" por el LLM.
- **Dataset:** `FACTURACION-CLIENTES.csv` + tablas de escenario (`BRAINY_PRORRATEO_ALTASV3.csv`, `BRAINY_RECONEXIONESV3.csv`).

### 3. Explicación de 2 escenarios garantizados
- **Prorrateo por cambio de plan** — cuenta detectada vía `BRAINY_PRORRATEO_ALTASV3.csv` (1,642 cuentas, sin nulos).
- **Cobro por reconexión tras suspensión** — cuenta detectada vía `BRAINY_RECONEXIONESV3.csv` (5,199 cuentas, sin nulos críticos), charge code `OC1_RECONEXION` = "Cargo por Reconexión" (confirmado en `CATALOGO-OFERTAS.csv`).
- **Criterio de aceptación:** para al menos 2 cuentas reales de estos datasets, el bot explica correctamente la causa, el monto y la fecha.

### 4. Traducción a lenguaje humano (capa determinista + Gemini)
- **Qué hace:** una vez identificado el `CHARGE_CODE`, se mapea directo a la sección correspondiente del MD de conceptos (curado del material de Academia Movistar) y Gemini redacta la explicación final combinando: números exactos (paso 2) + concepto general (este paso).
- **Criterio de aceptación:** el LLM nunca recibe ni puede modificar los montos — solo redacta a partir de lo que ya se calculó.
- **Dataset:** MD curado a mano (`concepts/*.md`, por definir con el equipo) desde los PDF/PPTX de "Experto en facturación".

### 5. Retrieval vectorial liviano (preguntas abiertas / FAQ)
- **Qué hace:** cuando la pregunta no está atada a un cargo puntual, consulta el corpus Markdown local. La primera versión usa recuperación local determinista; los embeddings quedan detrás de la misma interfaz como evolución y nunca participan en cálculos.
- **Criterio de aceptación:** nunca decide montos, solo qué fragmento de explicación mostrar.
- **Dataset:** mismo MD curado + FAQ (si se arma una).

### 6. Next Best Action
- **Qué hace:** tras la explicación, ofrece: pagar, ver el detalle, o (si aplica) derivar a un asesor.
- **Criterio de aceptación:** las opciones mostradas dependen del resultado del diff engine, no son fijas.

### 7. Hand-off con contexto (vista completa)
- **Qué hace:** si el bot no puede resolver la consulta, muestra una pantalla/tarjeta con el resumen que "se envía al asesor": motivo, montos involucrados, y lo que ya se le explicó al cliente.
- **Criterio de aceptación:** el payload mostrado contiene datos reales de la conversación, no un texto fijo genérico.

## P1 — Si sobra tiempo

### 8. Tercer escenario: fin de descuento promocional
- **Dataset:** `BRAINY_DESCUENTOS_CUOTAS.csv`, campo `Traduccion`/`Descripcion`/`FechaFin`/`Monto_Descuento`.
- **Nota:** requiere manejar el encoding roto (leer con `latin-1`/`cp1252`).

### 9. Cross-selling restrictivo — 2 reglas
- **Regla 1 (fin de descuento):** si venció un `Descuento por fidelización` y la consulta se resolvió, y existe en `CATALOGO-OFERTAS.csv` una oferta vigente para el mismo `GRUPO`/`SUB_GRUPO` → ofrecerla.
- **Regla 2 (reconexión):** si el cargo fue `OC1_RECONEXION` y la consulta se resolvió, y el cliente no tiene ya un bono de datos activo → ofrecer un bono económico del catálogo.
- **Criterio de aceptación:** el bot nunca ofrece nada si la consulta no se resolvió, sin excepción.

### 10. "Efecto Efervescente"
- **Qué hace:** al cerrar una interacción resuelta positivamente, recuerda 1-2 beneficios que ya incluye el plan del cliente y que no está usando.
- **Dataset:** cruce entre el plan del cliente (`FACTURACION-CLIENTES.csv`) y `CATALOGO-OFERTAS.csv`.

### 11. Clasificador de tono simple
- **Qué hace:** detección básica (por palabras clave o clasificación simple con Gemini) de si el cliente está molesto/confundido, para ajustar el tono de la respuesta o priorizar el hand-off.
- **Nota:** no es un requisito de las bases, es una mejora de UX — evaluar si hay tiempo.

## P2 — Roadmap para el pitch (no se construye)

- Integración real con WhatsApp Business API.
- Conexión real a BrainyBill / CRM Amdocs en vez de CSV locales.
- Automatización con IA de la extracción PDF/PPTX → MD.
- Ver recibos de múltiples líneas bajo la misma cuenta financiera.
- Modelo de predicción (regresión/ML) del próximo recibo — descartado por ahora para proteger la trazabilidad.
