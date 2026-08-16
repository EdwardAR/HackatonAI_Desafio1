from decimal import Decimal

import pytest
from sqlalchemy import select

from app.core.config import Settings
from app.models import Proration
from app.services.ai_explainer import AIExplainer
from app.services.billing_engine import BillingEngine


def test_analysis_reconciles_all_money(db):
    analysis = BillingEngine().analyze(db, "CUST-DEMO-001")

    assert analysis.recibo_actual == Decimal("120.00")
    assert analysis.recibo_anterior == Decimal("80.00")
    assert analysis.variacion == Decimal("40.00")
    assert analysis.variacion_porcentaje == Decimal("50.00")
    assert len(analysis.tendencia) == 6
    assert analysis.reconciliado is True
    assert sum(cause.impacto for cause in analysis.causas) == Decimal("40.00")


def test_unknown_customer_is_404(db):
    with pytest.raises(Exception) as error:
        BillingEngine().analyze(db, "MISSING")
    assert getattr(error.value, "status_code", None) == 404


def test_explainer_uses_only_calculated_amounts(db, monkeypatch):
    analysis = BillingEngine().analyze(db, "CUST-DEMO-001")
    explainer = AIExplainer()
    text, source = explainer.explain(analysis, use_ai=False)
    assert source == "deterministic"
    assert "S/40.00" in text
    assert "S/20.00" in text
    assert "S/15.00" in text
    assert "S/5.00" in text


def test_ai_phrase_validator_rejects_financial_content():
    assert AIExplainer._format_money(Decimal("-12.50")) == "-S/12.50"


def test_residual_is_backed_by_invoice_detail(db):
    proration = db.scalar(select(Proration).where(Proration.recibo == "REC-2026-08"))
    proration.monto = Decimal("3.00")
    db.commit()
    analysis = BillingEngine().analyze(db, "CUST-DEMO-001")
    residual = next(cause for cause in analysis.causas if cause.tipo == "OTROS_CARGOS")
    assert residual.impacto == Decimal("2.00")
    assert residual.evidencia[0].table == "detalle_factura"
    assert analysis.reconciliado is True


def test_ai_rewrites_only_authorized_phrases(db, monkeypatch):
    analysis = BillingEngine().analyze(db, "CUST-DEMO-001")
    explainer = AIExplainer(Settings(gemini_api_key="test"))
    monkeypatch.setattr(explainer, "_gemini_phrases", lambda items: {item.id: item.explicacion for item in items})
    text, source = explainer.explain(analysis)
    assert source == "gemini-validated"
    assert "S/40.00" in text

    monkeypatch.setattr(explainer, "_gemini_phrases", lambda _: (_ for _ in ()).throw(ValueError("unsafe")))
    fallback, source = explainer.explain(analysis)
    assert source == "deterministic-fallback"
    assert "S/40.00" in fallback


def test_guaranteed_scenarios_are_separate_and_reconciled(db):
    reconnection = BillingEngine().analyze(db, "CUST-DEMO-RECON")
    assert reconnection.variacion == Decimal("15.00")
    assert {cause.tipo for cause in reconnection.causas} == {"RECONEXION"}
    assert reconnection.reconciliado is True

    proration = BillingEngine().analyze(db, "CUST-DEMO-PRORATE")
    assert proration.variacion == Decimal("15.00")
    assert {cause.tipo for cause in proration.causas} == {"PRORRATEO", "CAMBIO_PLAN"}
    assert proration.reconciliado is True

    discount = BillingEngine().analyze(db, "CUST-DEMO-DISCOUNT")
    assert discount.variacion == Decimal("20.00")
    assert {cause.tipo for cause in discount.causas} == {"FIN_DESCUENTO"}
    assert discount.reconciliado is True
