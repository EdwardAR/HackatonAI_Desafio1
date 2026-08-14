const API_URL = process.env.CLARIA_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.CLARIA_API_KEY ?? "demo-claria-key";

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/analisis/CUST-DEMO-001`, { headers: { "X-API-Key": API_KEY }, cache: "no-store" });
    if (!response.ok) return Response.json({ detail: "API no disponible" }, { status: response.status });
    return Response.json(await response.json());
  } catch {
    return Response.json({ detail: "Modo demo activo" }, { status: 503 });
  }
}
