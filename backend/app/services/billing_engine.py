from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Customer, Invoice
from app.schemas.billing import BillingAnalysis, Cause, Evidence, HistoryPoint
from app.services.rules_engine import RulesEngine


CENT = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


class BillingEngine:
    def __init__(self, rules: RulesEngine | None = None) -> None:
        self.rules = rules or RulesEngine()

    def analyze(self, db: Session, customer_key: str) -> BillingAnalysis:
        customer = db.scalar(select(Customer).where(Customer.customer_key == customer_key))
        if not customer:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
        invoices = list(
            db.scalars(
                select(Invoice)
                .options(selectinload(Invoice.details))
                .where(Invoice.customer_id == customer.id)
                .order_by(Invoice.period_end.desc())
                .limit(6)
            ).all()
        )
        if not invoices:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El cliente no tiene facturas")

        current = invoices[0]
        previous = invoices[1] if len(invoices) > 1 else None
        variation = money(current.importe_total - (previous.importe_total if previous else Decimal("0")))
        causes = self.rules.evaluate(db, current, previous)
        causes = self._reconcile(variation, causes, current, previous)
        previous_total = money(previous.importe_total) if previous else None
        percentage = None
        if previous and previous.importe_total:
            percentage = money((variation / previous.importe_total) * Decimal("100"))

        return BillingAnalysis(
            cliente=customer.customer_key,
            numero_recibo=current.numero_recibo,
            ciclo_actual=current.ciclo,
            recibo_actual=money(current.importe_total),
            recibo_anterior=previous_total,
            variacion=variation,
            variacion_porcentaje=percentage,
            tendencia=[HistoryPoint(ciclo=row.ciclo, period_end=row.period_end, importe_total=money(row.importe_total)) for row in reversed(invoices)],
            causas=causes,
            reconciliado=money(sum((cause.impacto for cause in causes), Decimal("0"))) == variation,
            generated_at=datetime.now(timezone.utc),
        )

    @staticmethod
    def _reconcile(variation: Decimal, causes: list[Cause], current: Invoice, previous: Invoice | None) -> list[Cause]:
        explained = money(sum((cause.impacto for cause in causes), Decimal("0")))
        residual = money(variation - explained)
        if abs(residual) < CENT:
            return causes
        current_groups = BillingEngine._group_totals(current)
        previous_groups = BillingEngine._group_totals(previous) if previous else {}
        changed = sorted(
            ((group, money(amount - previous_groups.get(group, Decimal("0")))) for group, amount in current_groups.items()),
            key=lambda item: abs(item[1]), reverse=True,
        )
        evidence_value = ", ".join(f"{group}:{delta}" for group, delta in changed[:3] if delta) or str(residual)
        causes.append(
            Cause(
                id=f"DELTA_DETALLE:{current.id}", tipo="OTROS_CARGOS", impacto=residual,
                explicacion="Cambió el total de otros conceptos facturados",
                evidencia=[Evidence(table="detalle_factura", record_id=str(current.id), field="delta_por_grupo", value=evidence_value)],
            )
        )
        return causes

    @staticmethod
    def _group_totals(invoice: Invoice | None) -> dict[str, Decimal]:
        totals: dict[str, Decimal] = {}
        if not invoice:
            return totals
        for detail in invoice.details:
            totals[detail.grupo] = totals.get(detail.grupo, Decimal("0")) + detail.monto
        return totals
