from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models import Customer, Discount, Invoice, InvoiceDetail, OfferCatalog, Proration, Reconnection


def seed_demo(db: Session) -> Customer:
    existing = db.scalar(select(Customer).where(Customer.customer_key == "CUST-DEMO-001"))
    if existing:
        return existing

    customer = Customer(
        customer_key="CUST-DEMO-001", financial_account="FA-DEMO-9001", subscriber_key="SUB-DEMO-7001",
        telefono_hash="sha256:demo-only-5d41402abc4b2a76", fecha_activacion=date(2024, 1, 15),
        lob_type="MOVIL", negocio="Hogar",
    )
    db.add(customer)
    db.flush()
    cycles = [
        ("2026-03", date(2026,3,1), date(2026,3,31), Decimal("80.00")),
        ("2026-04", date(2026,4,1), date(2026,4,30), Decimal("80.00")),
        ("2026-05", date(2026,5,1), date(2026,5,31), Decimal("80.00")),
        ("2026-06", date(2026,6,1), date(2026,6,30), Decimal("80.00")),
        ("2026-07", date(2026,7,1), date(2026,7,31), Decimal("80.00")),
        ("2026-08", date(2026,8,1), date(2026,8,31), Decimal("120.00")),
    ]
    for cycle, start, end, total in cycles:
        invoice = Invoice(
            numero_recibo=f"REC-{cycle}", customer_id=customer.id, customer_key=customer.customer_key,
            subscriber_key=customer.subscriber_key, billing_arrangement_key="BA-DEMO-01",
            financial_account_key=customer.financial_account, ciclo=cycle, period_start=start, period_end=end,
            importe_total=total, importe_neto=total,
        )
        db.add(invoice)
        db.flush()
        db.add(InvoiceDetail(factura_id=invoice.id, charge_code="PLAN-100", charge_desc="Plan Movistar Total", charge_classification="RENTA", grupo="PLAN", subgrupo="RENTA_MENSUAL", monto=Decimal("100.00")))
        if cycle != "2026-08":
            db.add(InvoiceDetail(factura_id=invoice.id, charge_code="DISC-WELCOME", charge_desc="Descuento de bienvenida", charge_classification="DESCUENTO", grupo="DESCUENTOS", subgrupo="PROMOCION", monto=Decimal("-20.00")))
        else:
            db.add_all([
                InvoiceDetail(factura_id=invoice.id, charge_code="RECONNECT", charge_desc="Cargo por reconexión", charge_classification="CARGO", grupo="SERVICIOS", subgrupo="RECONEXION", monto=Decimal("15.00")),
                InvoiceDetail(factura_id=invoice.id, charge_code="PRORATE", charge_desc="Ajuste proporcional", charge_classification="AJUSTE", grupo="AJUSTES", subgrupo="PRORRATEO", monto=Decimal("5.00")),
            ])

    db.add_all([
        OfferCatalog(charge_code="PLAN-100", rate_final=Decimal("100.00"), tipo_renta="MENSUAL"),
        Discount(billing_arrangement="BA-DEMO-01", cuenta_financiera=customer.financial_account, telefono_hash=customer.telefono_hash, fecha_inicio=date(2026,3,1), fecha_fin=date(2026,7,31), porcentaje=Decimal("20.00"), monto_descuento=Decimal("20.00"), tipo_descuento="BIENVENIDA", descripcion="el descuento de bienvenida"),
        Proration(ba="BA-DEMO-01", cuenta_financiera=customer.financial_account, recibo="REC-2026-08", ciclo="2026-08", monto=Decimal("5.00"), cantidad_cargos=1),
        Reconnection(customer_key=customer.customer_key, recibo="REC-2026-08", fecha_reconexion=date(2026,8,12), fecha_corte=date(2026,8,10), monto=Decimal("15.00"), descripcion="Se aplicó un cargo por reconexión"),
    ])
    db.commit()
    db.refresh(customer)
    return customer


if __name__ == "__main__":
    with SessionLocal() as session:
        seed_demo(session)
        print("Demo cargada: CUST-DEMO-001")
