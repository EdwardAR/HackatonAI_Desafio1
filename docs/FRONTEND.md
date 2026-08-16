# Frontend — especificación de pantallas

Para el compañero que va a implementar la UI. Contexto rápido: hay **un solo motor de chat** (`components/Chat.tsx`) que se muestra dentro de dos "pieles" distintas — no se construyen dos chats separados. Todo el detalle de negocio (qué responde el bot, cuándo aparece cross-selling, etc.) ya lo resuelve el backend en `app/api/chat/route.ts` — el frontend solo consume esa respuesta y la pinta. Ver [FLUJO-INFORMACION.md](./FLUJO-INFORMACION.md) para cómo se arma esa respuesta.

## Contrato de datos con el backend

**`GET /api/customers`** — para el selector de cliente de la demo.
```ts
type Customer = {
  customer_key: string;    // identificador interno sintético
  display_name: string;    // alias ficticio generado para la demo
  demo_phone: string;      // número sintético, nunca telefono_hash real
  scenario: string;        // etiqueta visible para el jurado
};
// respuesta: Customer[]
```

**`POST /api/chat`** — el endpoint principal.
```ts
type ChatRequest = {
  customer_key: string;
  message: string;        // lo que escribió/clickeó el cliente
  conversation_id?: string; // para mantener memoria de contexto
  channel: "web" | "whatsapp";
};

type ChatResponse = {
  conversation_id: string;
  text: string;                     // Gemini validado o fallback determinista
  breakdown?: {                     // presente si hubo un diff con causa identificada
    concept: string;                // ej. "Reconexión"
    amount: number;
    previous_amount: number;
    date: string;
  }[];
  actions: ("pagar" | "ver_detalle" | "derivar_asesor" | "cross_sell")[];
  cross_sell_offer?: { title: string; description: string; price: string; source_offer_code: string } | null;
  handoff?: {                       // presente solo si se activó el hand-off
    reason: string;
    context: Record<string, unknown>;
  } | null;
  closing_reminder?: string | null;  // mensaje del "Efecto Efervescente", si aplica
};
```

Con esto alcanza para pintar cualquiera de las 2 pantallas — ninguna decisión de negocio se toma en el frontend.

---

## Pantalla 1 — Vista "App Mi Movistar"

**Propósito:** simular la pantalla de recibo dentro de la app, con un botón que abre el chat.

**Layout (de arriba hacia abajo):**
1. **Selector de cliente** (solo para la demo, no es parte del producto real) — un dropdown simple arriba de todo para cambiar entre las cuentas de prueba (`GET /api/customers`). Al cambiar, se recarga todo lo de abajo.
2. **Header:** nombre del cliente + ciclo de facturación actual.
3. **Tarjeta de recibo actual:** monto total grande, fecha de vencimiento.
4. **Comparativo visual:** gráfico del recibo actual y los cinco anteriores usando `GET /api/analysis?customer_key=...`; el navegador no lee CSV directamente.
5. **Botón principal:** *"¿Por qué pagué esto?"* / *"Explicar mi recibo"* — al hacer click, abre el panel de chat (puede ser un panel lateral, un modal, o expandirse debajo de la tarjeta, lo que sea más rápido de construir) y dispara automáticamente el primer mensaje al backend (algo como `message: "explicar variación del recibo actual"`).

**Estados:**
- Sin variación detectada: el chat igual se puede abrir, pero el primer mensaje del bot indica que no hubo cambios relevantes.
- Con variación: el chat abre directo mostrando la explicación + `breakdown` como tarjetas (una por causa, si hay más de una).

---

## Pantalla 2 — Motor de chat (compartido)

**Propósito:** el componente que realmente conversa. Se usa embebido en la Pantalla 1 y también es la base de la Pantalla 3.

**Elementos:**
- **Burbujas de mensaje:** usuario a la derecha, bot a la izquierda — estándar.
- **Tarjetas enriquecidas dentro de un mensaje del bot** (no todo es texto plano):
  - Tarjeta de desglose: usa `breakdown` de la respuesta — barra comparativa + hasta 3 causas principales, cada una con su monto.
  - Botones de acción: uno por cada valor en `actions` (Pagar, Ver detalle, Derivar a un asesor). Al clickear "Derivar a un asesor" se manda un mensaje especial al backend que fuerza el hand-off.
  - Tarjeta de oferta (`cross_sell_offer`): solo se pinta si el backend la manda — nunca se decide en el frontend si mostrarla o no.
  - Tarjeta de hand-off (`handoff`): `Chat.tsx` muestra el "resumen enviado al asesor" (motivo + contexto) para que el cliente vea que su información viaja con él.
  - Mensaje de cierre (`closing_reminder`): se pinta al final de la respuesta cuando viene presente, con un estilo más suave.
- **Memoria de contexto:** el `conversation_id` viaja en cada request; el frontend no necesita reconstruir el historial completo.
- **Input de texto libre** + los botones de acción de la última respuesta del bot (ambos caminos válidos para responder).

---

## Pantalla 3 — Skin WhatsApp

**Propósito:** mismo `Chat.tsx`, pero envuelto para que visualmente parezca WhatsApp — esto es lo que sostiene la historia omnicanal en el pitch.

**Layout:**
1. **Header estilo WhatsApp:** foto/ícono de contacto, nombre tipo "Bot Lucía", estado "en línea".
2. **Paso previo antes de mostrar el chat:** número sintético de la lista + código demo `1234`. No se usa DNI ni dato real; ambos valores viven solo en memoria y sostienen la narrativa Zero Trust.
3. **El chat en sí:** el mismo `Chat.tsx`, con el CSS de burbujas verdes/blancas típico de WhatsApp en vez del estilo de la Pantalla 1.

**Diferencia clave con la Pantalla 1:** acá no hay "tarjeta de recibo" de fondo — el cliente llega directo al chat y todo (incluido el primer desglose) pasa dentro de la conversación.

---

## Notas para quien lo implemente

- No hace falta que las 2 pantallas compartan layout de página, pero sí **deben compartir el componente `Chat.tsx` sin duplicar lógica** — si algo del negocio cambia (ej. una nueva acción), se cambia en un solo lugar.
- Todos los datos que se muestran (montos, nombres, ofertas) vienen del backend — si en algún punto el frontend necesita "inventar" un texto porque el backend no lo mandó, es señal de que falta un campo en el contrato de datos, no de que hay que hardcodearlo.
- Paleta y estilo visual: libre, pero que la Pantalla 1 se sienta "app de telecom" (azul/blanco, tarjetas limpias) y la Pantalla 3 se sienta "WhatsApp" (verde, burbujas) — es lo que vende la idea de omnicanalidad de un vistazo.
