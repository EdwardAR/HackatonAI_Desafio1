import json

from sqlalchemy.orm import Session

from app.models import AuditLog


def record_audit(
    db: Session,
    *,
    actor: str,
    action: str,
    customer_key: str | None,
    resource_id: str | None,
    outcome: str = "success",
    metadata: dict[str, object] | None = None,
) -> None:
    safe_metadata = {key: value for key, value in (metadata or {}).items() if key not in {"telefono", "dni", "financial_account"}}
    db.add(
        AuditLog(
            actor=actor,
            action=action,
            customer_key=customer_key,
            resource_id=resource_id,
            outcome=outcome,
            metadata_json=json.dumps(safe_metadata, ensure_ascii=False, default=str),
        )
    )
    db.commit()
