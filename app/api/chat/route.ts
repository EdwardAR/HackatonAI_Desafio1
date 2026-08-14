const API_URL = process.env.CLARIA_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.CLARIA_API_KEY ?? "demo-claria-key";

export async function POST(request: Request) {
  const payload = await request.json() as { message?: string };
  if (!payload.message) return Response.json({ detail: "Mensaje requerido" }, { status: 422 });
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ customer_key: "CUST-DEMO-001", message: payload.message }),
    });
    if (!response.ok) return Response.json({ detail: "API no disponible" }, { status: response.status });
    return Response.json(await response.json());
  } catch {
    return Response.json({ detail: "Modo demo activo" }, { status: 503 });
  }
}
