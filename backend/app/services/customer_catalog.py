from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Customer
from app.schemas.billing import DemoCustomerOut
from app.services.billing_engine import BillingEngine


DEMO_PROFILES = {
    "CUST-DEMO-001": ("Elena R.", "999000001", "Caso combinado"),
    "CUST-DEMO-RECON": ("Marco T.", "999000002", "Reconexión"),
    "CUST-DEMO-PRORATE": ("Lucía V.", "999000003", "Prorrateo"),
    "CUST-DEMO-DISCOUNT": ("Diego S.", "999000004", "Fin de descuento"),
}


class CustomerCatalog:
    """Expone alias sintéticos; nunca devuelve teléfono, hash ni cuenta financiera reales."""

    def list_demo(self, db: Session) -> list[DemoCustomerOut]:
        keys = list(db.scalars(select(Customer.customer_key).order_by(Customer.customer_key)).all())
        result: list[DemoCustomerOut] = []
        for index, key in enumerate(keys, 1):
            name, phone, scenario = DEMO_PROFILES.get(
                key,
                (f"Cliente demo {index}", f"9999{index:05d}", "Datos importados"),
            )
            analysis = BillingEngine().analyze(db, key)
            cause_label = " + ".join(cause.tipo.replace("_", " ").title() for cause in analysis.causas[:2])
            result.append(
                DemoCustomerOut(
                    customer_key=key,
                    display_name=name,
                    demo_phone=phone,
                    scenario=scenario,
                    cause_label=cause_label or "Sin cambios relevantes",
                    variation=analysis.variacion,
                )
            )
        return result
