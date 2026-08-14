from datetime import date
from decimal import Decimal

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.models import CreditNote, Discount, Invoice, Order, Proration, Reconnection
from app.schemas.billing import Cause, Evidence


MONEY_ZERO = Decimal("0.00")


class RulesEngine:
    """Emits causes only when a persisted record satisfies an explicit rule."""

    def evaluate(self, db: Session, invoice: Invoice, previous: Invoice | None) -> list[Cause]:
        causes: list[Cause] = []
        causes.extend(self._discount_ended(db, invoice, previous))
        causes.extend(self._prorations(db, invoice))
        causes.extend(self._reconnections(db, invoice))
        causes.extend(self._plan_changes(db, invoice, previous))
        causes.extend(self._notes(db, invoice))
        return causes

    def _discount_ended(self, db: Session, invoice: Invoice, previous: Invoice | None) -> list[Cause]:
        lower_bound = previous.period_end if previous else invoice.period_start
        rows = db.scalars(
            select(Discount).where(
                Discount.billing_arrangement == invoice.billing_arrangement_key,
                Discount.fecha_fin >= lower_bound,
                Discount.fecha_fin < invoice.period_end,
                Discount.monto_descuento > 0,
            )
        ).all()
        return [
            Cause(
                id=f"FIN_DESCUENTO:{row.id}", tipo="FIN_DESCUENTO", impacto=abs(row.monto_descuento),
                explicacion=f"Finalizó {row.descripcion}",
                evidencia=[Evidence(table="descuentos", record_id=str(row.id), field="fecha_fin", value=row.fecha_fin.isoformat())],
            )
            for row in rows
        ]

    def _prorations(self, db: Session, invoice: Invoice) -> list[Cause]:
        rows = db.scalars(select(Proration).where(Proration.recibo == invoice.numero_recibo, Proration.monto != 0)).all()
        return [
            Cause(
                id=f"PRORRATEO:{row.id}", tipo="PRORRATEO", impacto=row.monto,
                explicacion="Se aplicó un ajuste proporcional por días de servicio",
                evidencia=[Evidence(table="prorrateos", record_id=str(row.id), field="monto", value=str(row.monto))],
            ) for row in rows
        ]

    def _reconnections(self, db: Session, invoice: Invoice) -> list[Cause]:
        rows = db.scalars(
            select(Reconnection).where(
                Reconnection.customer_key == invoice.customer_key,
                Reconnection.recibo == invoice.numero_recibo,
                Reconnection.monto > 0,
            )
        ).all()
        return [
            Cause(
                id=f"RECONEXION:{row.id}", tipo="RECONEXION", impacto=row.monto,
                explicacion=row.descripcion or "Se aplicó un cargo por reconexión",
                evidencia=[Evidence(table="reconexiones", record_id=str(row.id), field="fecha_reconexion", value=row.fecha_reconexion.isoformat())],
            ) for row in rows
        ]

    def _plan_changes(self, db: Session, invoice: Invoice, previous: Invoice | None) -> list[Cause]:
        keywords = ["%cambio plan%", "%migración%", "%migracion%", "%upgrade%", "%downgrade%"]
        predicate = or_(*[Order.motivo.ilike(word) for word in keywords], *[Order.tipo_orden.ilike(word) for word in keywords])
        rows = db.scalars(
            select(Order).where(
                Order.customer_key == invoice.customer_key,
                Order.fecha_inicio.between(invoice.period_start, invoice.period_end),
                predicate,
            )
        ).all()
        if not rows:
            return []
        impact = self._plan_delta(invoice, previous)
        return [
            Cause(
                id=f"CAMBIO_PLAN:{row.id}", tipo="CAMBIO_PLAN", impacto=impact,
                explicacion=f"Se registró {row.motivo}",
                evidencia=[Evidence(table="ordenes", record_id=str(row.id), field="fecha_inicio", value=row.fecha_inicio.isoformat())],
            ) for row in rows
        ]

    @staticmethod
    def _plan_delta(invoice: Invoice, previous: Invoice | None) -> Decimal:
        current = sum((d.monto for d in invoice.details if d.grupo.upper() == "PLAN"), MONEY_ZERO)
        old = sum((d.monto for d in previous.details if d.grupo.upper() == "PLAN"), MONEY_ZERO) if previous else MONEY_ZERO
        return current - old

    def _notes(self, db: Session, invoice: Invoice) -> list[Cause]:
        rows = db.scalars(
            select(CreditNote).where(
                CreditNote.customer_key == invoice.customer_key,
                CreditNote.fecha.between(invoice.period_start, invoice.period_end),
                CreditNote.monto != 0,
            )
        ).all()
        result: list[Cause] = []
        for row in rows:
            is_debit = "DEBIT" in row.tipo_nota.upper()
            kind = "NOTA_DEBITO" if is_debit else "NOTA_CREDITO"
            impact = abs(row.monto) if is_debit else -abs(row.monto)
            result.append(
                Cause(
                    id=f"{kind}:{row.id}", tipo=kind, impacto=impact,
                    explicacion="Se aplicó una nota de débito" if is_debit else "Se aplicó una nota de crédito",
                    evidencia=[Evidence(table="notas_credito", record_id=str(row.id), field="monto", value=str(row.monto))],
                )
            )
        return result
