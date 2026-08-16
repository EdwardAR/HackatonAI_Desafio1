AUTH = {"X-API-Key": "demo-claria-key"}


def test_health_is_public(client):
    assert client.get("/health").json()["status"] == "ok"


def test_business_routes_require_auth(client):
    assert client.get("/clientes/CUST-DEMO-001").status_code == 401


def test_customer_and_invoices_do_not_expose_pii(client):
    customer = client.get("/clientes/CUST-DEMO-001", headers=AUTH)
    assert customer.status_code == 200
    assert set(customer.json()) == {"customer_key", "fecha_activacion", "lob_type", "negocio"}
    invoice = client.get("/facturas/CUST-DEMO-001", headers=AUTH)
    assert invoice.status_code == 200
    assert invoice.json()["importe_total"] == "120.00"
    assert len(client.get("/facturas/CUST-DEMO-001/historial", headers=AUTH).json()) == 6

    catalog = client.get("/clientes", headers=AUTH)
    assert catalog.status_code == 200
    assert len(catalog.json()) == 4
    assert set(catalog.json()[0]) == {"customer_key", "display_name", "demo_phone", "scenario"}
    assert all("sha256" not in item["demo_phone"] for item in catalog.json())


def test_analysis_explanation_and_chat(client):
    analysis = client.get("/analisis/CUST-DEMO-001", headers=AUTH)
    assert analysis.status_code == 200
    assert analysis.json()["reconciliado"] is True
    explained = client.post("/explicar-recibo", headers=AUTH, json={"customer_key": "CUST-DEMO-001", "use_ai": False})
    assert explained.status_code == 200
    assert explained.json()["generated_by"] == "deterministic"
    chat = client.post("/chat", headers=AUTH, json={"customer_key": "CUST-DEMO-001", "message": "¿Por qué aumentó?"})
    assert chat.status_code == 200
    payload = chat.json()
    assert payload["text"] == payload["answer"]
    assert len(payload["breakdown"]) == 3
    assert payload["actions"] == ["pagar", "ver_detalle", "cross_sell"]
    assert payload["cross_sell_offer"]["source_offer_code"] == "BONO-2GB"
    assert payload["handoff"] is None
    conversation_id = payload["conversation_id"]
    history = client.get(f"/conversaciones/{conversation_id}", headers=AUTH)
    assert [message["role"] for message in history.json()["messages"]] == ["user", "assistant"]


def test_not_found_routes(client):
    assert client.get("/clientes/MISSING", headers=AUTH).status_code == 404
    assert client.get("/facturas/MISSING", headers=AUTH).status_code == 404
    assert client.get("/conversaciones/00000000-0000-0000-0000-000000000001", headers=AUTH).status_code == 404


def test_telegram_ignores_non_message_update(client):
    assert client.post("/telegram/webhook", json={"update_id": 1}).json() == {"ok": True}


def test_telegram_answers_demo_customer(client):
    response = client.post("/telegram/webhook", json={"message": {"chat": {"id": 123}, "text": "¿Por qué aumentó?"}})
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_chat_rejects_foreign_conversation(client):
    response = client.post("/chat", headers=AUTH, json={"customer_key": "CUST-DEMO-001", "message": "Hola", "conversation_id": "00000000-0000-0000-0000-000000000001"})
    assert response.status_code == 404


def test_chat_handoff_has_real_context_and_never_cross_sells(client):
    response = client.post("/chat", headers=AUTH, json={"customer_key": "CUST-DEMO-RECON", "message": "No reconozco este cobro, quiero un asesor", "channel": "whatsapp"})
    payload = response.json()
    assert payload["actions"] == ["derivar_asesor"]
    assert payload["cross_sell_offer"] is None
    assert payload["handoff"]["context"]["consulta"].startswith("No reconozco")
    assert payload["generated_by"] == "deterministic-handoff"


def test_chat_uses_knowledge_and_closing_effect(client):
    payment = client.post("/chat", headers=AUTH, json={"customer_key": "CUST-DEMO-PRORATE", "message": "¿Cómo pago?"}).json()
    assert payment["generated_by"] == "knowledge-retrieval"
    assert payment["breakdown"] == []
    assert payment["cross_sell_offer"] is None

    closing = client.post("/chat", headers=AUTH, json={"customer_key": "CUST-DEMO-RECON", "message": "Gracias, quedó claro"}).json()
    assert closing["closing_reminder"] is not None
    assert closing["tone"] == "neutral"

    discount = client.post("/chat", headers=AUTH, json={"customer_key": "CUST-DEMO-DISCOUNT", "message": "Explica el cambio"}).json()
    assert discount["cross_sell_offer"]["source_offer_code"] == "PLAN-95-FIDELIDAD"
