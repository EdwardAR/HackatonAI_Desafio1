const API_URL = process.env.CLARIA_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.CLARIA_API_KEY ?? "demo-claria-key";

export async function POST(request: Request) {
  const payload = await request.json() as { customer_key?: string; message?: string; conversation_id?: string; channel?: "web" | "whatsapp" };
  if (!payload.message || !payload.customer_key) return Response.json({ detail: "Cliente y mensaje requeridos" }, { status: 422 });
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ customer_key: payload.customer_key, message: payload.message, conversation_id: payload.conversation_id, channel: payload.channel ?? "web" }),
    });
    if (!response.ok) return Response.json({ detail: "API no disponible" }, { status: response.status });
    return Response.json(await response.json());
  } catch {
    return Response.json({ detail: "Modo demo activo" }, { status: 503 });
  }
}
