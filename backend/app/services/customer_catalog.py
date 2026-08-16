from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Customer
from app.schemas.billing import DemoCustomerOut


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
            result.append(
                DemoCustomerOut(
                    customer_key=key,
                    display_name=name,
                    demo_phone=phone,
                    scenario=scenario,
                )
            )
        return result
