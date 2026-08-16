const API_URL = process.env.CLARIA_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.CLARIA_API_KEY ?? "demo-claria-key";

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/clientes`, { headers: { "X-API-Key": API_KEY }, cache: "no-store" });
    if (!response.ok) return Response.json({ detail: "API no disponible" }, { status: response.status });
    return Response.json(await response.json());
  } catch {
    return Response.json([
      { customer_key: "CUST-DEMO-RECON", display_name: "Marco T.", demo_phone: "999000002", scenario: "Reconexión" },
      { customer_key: "CUST-DEMO-PRORATE", display_name: "Lucía V.", demo_phone: "999000003", scenario: "Prorrateo" },
      { customer_key: "CUST-DEMO-DISCOUNT", display_name: "Diego S.", demo_phone: "999000004", scenario: "Fin de descuento" },
    ]);
  }
}
