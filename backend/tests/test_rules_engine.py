from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import CreditNote, Invoice, Order
from app.services.rules_engine import RulesEngine


def test_core_rules_emit_evidence(db):
    invoice = db.scalar(select(Invoice).options(selectinload(Invoice.details)).where(Invoice.numero_recibo == "REC-2026-08"))
    previous = db.scalar(select(Invoice).options(selectinload(Invoice.details)).where(Invoice.numero_recibo == "REC-2026-07"))
    causes = RulesEngine().evaluate(db, invoice, previous)
    assert {cause.tipo for cause in causes} == {"FIN_DESCUENTO", "PRORRATEO", "RECONEXION"}
    assert all(cause.evidencia for cause in causes)


def test_plan_change_and_notes_are_signed(db):
    db.add_all([
        Order(subscriber_key="SUB-DEMO-7001", customer_key="CUST-DEMO-001", fecha_inicio=date(2026,8,5), fecha_fin=date(2026,8,5), motivo="Upgrade Cambio Plan", motivo_id="UP-1", tipo_orden="Cambio Plan", estado="COMPLETADA"),
        CreditNote(customer_key="CUST-DEMO-001", subscriber_key="SUB-DEMO-7001", charge_code="CR-1", tipo_nota="CREDITO", monto=Decimal("7.00"), fecha=date(2026,8,20)),
        CreditNote(customer_key="CUST-DEMO-001", subscriber_key="SUB-DEMO-7001", charge_code="DB-1", tipo_nota="DEBITO", monto=Decimal("3.00"), fecha=date(2026,8,21)),
    ])
    db.commit()
    invoice = db.scalar(select(Invoice).options(selectinload(Invoice.details)).where(Invoice.numero_recibo == "REC-2026-08"))
    previous = db.scalar(select(Invoice).options(selectinload(Invoice.details)).where(Invoice.numero_recibo == "REC-2026-07"))
    causes = RulesEngine().evaluate(db, invoice, previous)
    by_type = {cause.tipo: cause.impacto for cause in causes}
    assert by_type["CAMBIO_PLAN"] == Decimal("0.00")
    assert by_type["NOTA_CREDITO"] == Decimal("-7.00")
    assert by_type["NOTA_DEBITO"] == Decimal("3.00")
