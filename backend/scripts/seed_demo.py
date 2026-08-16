from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Customer, Discount, Invoice, InvoiceDetail, OfferCatalog, Order, Proration, Reconnection


CYCLES = [
    ("2026-03", date(2026, 3, 1), date(2026, 3, 31)),
    ("2026-04", date(2026, 4, 1), date(2026, 4, 30)),
    ("2026-05", date(2026, 5, 1), date(2026, 5, 31)),
    ("2026-06", date(2026, 6, 1), date(2026, 6, 30)),
    ("2026-07", date(2026, 7, 1), date(2026, 7, 31)),
    ("2026-08", date(2026, 8, 1), date(2026, 8, 31)),
]


def _customer(db: Session, key: str, suffix: str) -> Customer:
    customer = Customer(
        customer_key=key,
        financial_account=f"FA-DEMO-{suffix}",
        subscriber_key=f"SUB-DEMO-{suffix}",
        telefono_hash=f"sha256:synthetic-{suffix}",
        fecha_activacion=date(2024, 1, 15),
        lob_type="MOVIL",
        negocio="Móvil",
    )
    db.add(customer)
    db.flush()
    return customer


def _invoice(db: Session, customer: Customer, cycle: str, start: date, end: date, total: Decimal, prefix: str) -> Invoice:
    invoice = Invoice(
        numero_recibo=f"{prefix}-{cycle}",
        customer_id=customer.id,
        customer_key=customer.customer_key,
        subscriber_key=customer.subscriber_key,
        billing_arrangement_key=f"BA-{prefix}",
        financial_account_key=customer.financial_account,
        ciclo=cycle,
        period_start=start,
        period_end=end,
        importe_total=total,
        importe_neto=total,
    )
    db.add(invoice)
    db.flush()
    return invoice


def _detail(db: Session, invoice: Invoice, code: str, description: str, group: str, subgroup: str, amount: str) -> None:
    db.add(InvoiceDetail(
        factura_id=invoice.id,
        charge_code=code,
        charge_desc=description,
        charge_classification="CARGO" if Decimal(amount) >= 0 else "DESCUENTO",
        grupo=group,
        subgrupo=subgroup,
        monto=Decimal(amount),
    ))


def _seed_combined(db: Session) -> Customer:
    customer = _customer(db, "CUST-DEMO-001", "9001")
    for cycle, start, end in CYCLES:
        current = cycle == "2026-08"
        invoice = _invoice(db, customer, cycle, start, end, Decimal("120.00" if current else "80.00"), "REC")
        _detail(db, invoice, "PLAN-100", "Plan Movistar Total", "PLAN", "RENTA_MENSUAL", "100.00")
        if current:
            _detail(db, invoice, "OC1_RECONEXION", "Cargo por reconexión", "SERVICIOS", "RECONEXION", "15.00")
            _detail(db, invoice, "PRORRATEO", "Ajuste proporcional", "AJUSTES", "PRORRATEO", "5.00")
        else:
            _detail(db, invoice, "DISC-WELCOME", "Descuento de bienvenida", "DESCUENTOS", "PROMOCION", "-20.00")
    db.add_all([
        Discount(billing_arrangement="BA-REC", cuenta_financiera=customer.financial_account, telefono_hash=customer.telefono_hash, fecha_inicio=date(2026, 3, 1), fecha_fin=date(2026, 7, 31), porcentaje=Decimal("20.00"), monto_descuento=Decimal("20.00"), tipo_descuento="BIENVENIDA", descripcion="el descuento de bienvenida"),
        Proration(ba="BA-REC", cuenta_financiera=customer.financial_account, recibo="REC-2026-08", ciclo="2026-08", monto=Decimal("5.00"), cantidad_cargos=1),
        Reconnection(customer_key=customer.customer_key, recibo="REC-2026-08", fecha_reconexion=date(2026, 8, 12), fecha_corte=date(2026, 8, 10), monto=Decimal("15.00"), descripcion="Se aplicó un cargo por reconexión"),
    ])
    return customer


def _seed_reconnection(db: Session) -> Customer:
    customer = _customer(db, "CUST-DEMO-RECON", "9002")
    for cycle, start, end in CYCLES:
        current = cycle == "2026-08"
        invoice = _invoice(db, customer, cycle, start, end, Decimal("95.00" if current else "80.00"), "REC-RECON")
        _detail(db, invoice, "PLAN-80", "Plan Movistar 80", "PLAN", "RENTA_MENSUAL", "80.00")
        if current:
            _detail(db, invoice, "OC1_RECONEXION", "Cargo por reconexión", "SERVICIOS", "RECONEXION", "15.00")
    db.add(Reconnection(customer_key=customer.customer_key, recibo="REC-RECON-2026-08", fecha_reconexion=date(2026, 8, 12), fecha_corte=date(2026, 8, 10), monto=Decimal("15.00"), descripcion="Se aplicó un cargo por reconexión"))
    return customer


def _seed_proration(db: Session) -> Customer:
    customer = _customer(db, "CUST-DEMO-PRORATE", "9003")
    for cycle, start, end in CYCLES:
        current = cycle == "2026-08"
        invoice = _invoice(db, customer, cycle, start, end, Decimal("95.00" if current else "80.00"), "REC-PRORATE")
        _detail(db, invoice, "PLAN-90" if current else "PLAN-80", "Plan Movistar", "PLAN", "RENTA_MENSUAL", "90.00" if current else "80.00")
        if current:
            _detail(db, invoice, "PRORRATEO", "Ajuste proporcional", "AJUSTES", "PRORRATEO", "5.00")
    db.add_all([
        Proration(ba="BA-REC-PRORATE", cuenta_financiera=customer.financial_account, recibo="REC-PRORATE-2026-08", ciclo="2026-08", monto=Decimal("5.00"), cantidad_cargos=1),
        Order(subscriber_key=customer.subscriber_key, customer_key=customer.customer_key, fecha_inicio=date(2026, 8, 1), fecha_fin=None, motivo="Cambio plan solicitado", motivo_id="CAMBIO_PLAN", tipo_orden="Cambio plan", estado="COMPLETADA"),
    ])
    return customer


def _seed_discount(db: Session) -> Customer:
    customer = _customer(db, "CUST-DEMO-DISCOUNT", "9004")
    for cycle, start, end in CYCLES:
        current = cycle == "2026-08"
        invoice = _invoice(db, customer, cycle, start, end, Decimal("100.00" if current else "80.00"), "REC-DISCOUNT")
        _detail(db, invoice, "PLAN-100", "Plan Movistar Total", "PLAN", "RENTA_MENSUAL", "100.00")
        if not current:
            _detail(db, invoice, "DISC-LOYALTY", "Descuento por fidelización", "DESCUENTOS", "FIDELIZACION", "-20.00")
    db.add(Discount(billing_arrangement="BA-REC-DISCOUNT", cuenta_financiera=customer.financial_account, telefono_hash=customer.telefono_hash, fecha_inicio=date(2026, 3, 1), fecha_fin=date(2026, 7, 31), porcentaje=Decimal("20.00"), monto_descuento=Decimal("20.00"), tipo_descuento="FIDELIZACION", descripcion="el descuento por fidelización"))
    return customer


def seed_demo(db: Session) -> Customer:
    if not db.scalar(select(OfferCatalog).where(OfferCatalog.charge_code == "BONO-2GB")):
        db.add(OfferCatalog(charge_code="BONO-2GB", rate_final=Decimal("5.00"), tipo_renta="BONO_DATOS"))
    if not db.scalar(select(OfferCatalog).where(OfferCatalog.charge_code == "PLAN-100")):
        db.add(OfferCatalog(charge_code="PLAN-100", rate_final=Decimal("100.00"), tipo_renta="MENSUAL"))
    if not db.scalar(select(OfferCatalog).where(OfferCatalog.charge_code == "PLAN-95-FIDELIDAD")):
        db.add(OfferCatalog(charge_code="PLAN-95-FIDELIDAD", rate_final=Decimal("95.00"), tipo_renta="FIDELIZACION"))

    seeders = {
        "CUST-DEMO-001": _seed_combined,
        "CUST-DEMO-RECON": _seed_reconnection,
        "CUST-DEMO-PRORATE": _seed_proration,
        "CUST-DEMO-DISCOUNT": _seed_discount,
    }
    result = None
    for key, seeder in seeders.items():
        customer = db.scalar(select(Customer).where(Customer.customer_key == key))
        customer = customer or seeder(db)
        if key == "CUST-DEMO-001":
            result = customer
    db.commit()
    assert result is not None
    db.refresh(result)
    return result


if __name__ == "__main__":
    with SessionLocal() as session:
        seed_demo(session)
        print("Demo cargada: 4 escenarios disponibles")
