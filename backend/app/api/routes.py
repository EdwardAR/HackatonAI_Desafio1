import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.security import require_auth
from app.models import Conversation, Customer, Invoice
from app.schemas.billing import (
    BillingAnalysis,
    ChatRequest,
    ChatResponse,
    ConversationOut,
    CustomerPublic,
    DemoCustomerOut,
    ExplainRequest,
    ExplanationResponse,
    HistoryPoint,
    InvoiceOut,
)
from app.services.ai_explainer import AIExplainer
from app.services.audit_service import record_audit
from app.services.billing_engine import BillingEngine
from app.services.conversation_service import ConversationService
from app.services.customer_catalog import CustomerCatalog


router = APIRouter()
billing_engine = BillingEngine()


@router.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": "claria-api"}


@router.get("/clientes/{customer_key}", response_model=CustomerPublic, dependencies=[Depends(require_auth)], tags=["clientes"])
def get_customer(customer_key: str, db: Session = Depends(get_db)) -> Customer:
    customer = db.scalar(select(Customer).where(Customer.customer_key == customer_key))
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return customer


@router.get("/clientes", response_model=list[DemoCustomerOut], dependencies=[Depends(require_auth)], tags=["clientes"])
def list_demo_customers(db: Session = Depends(get_db)) -> list[DemoCustomerOut]:
    return CustomerCatalog().list_demo(db)


@router.get("/facturas/{customer_key}", response_model=InvoiceOut, dependencies=[Depends(require_auth)], tags=["facturas"])
def get_current_invoice(customer_key: str, db: Session = Depends(get_db)) -> Invoice:
    invoice = db.scalar(
        select(Invoice).options(selectinload(Invoice.details)).where(Invoice.customer_key == customer_key).order_by(Invoice.period_end.desc())
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice


@router.get("/facturas/{customer_key}/historial", response_model=list[HistoryPoint], dependencies=[Depends(require_auth)], tags=["facturas"])
def get_history(customer_key: str, db: Session = Depends(get_db)) -> list[HistoryPoint]:
    invoices = db.scalars(select(Invoice).where(Invoice.customer_key == customer_key).order_by(Invoice.period_end.desc()).limit(6)).all()
    return [HistoryPoint(ciclo=row.ciclo, period_end=row.period_end, importe_total=row.importe_total) for row in reversed(invoices)]


@router.get("/analisis/{customer_key}", response_model=BillingAnalysis, dependencies=[Depends(require_auth)], tags=["analisis"])
def get_analysis(customer_key: str, db: Session = Depends(get_db), actor: str = Depends(require_auth)) -> BillingAnalysis:
    analysis = billing_engine.analyze(db, customer_key)
    record_audit(db, actor=actor, action="billing.analyze", customer_key=customer_key, resource_id=analysis.numero_recibo, metadata={"causes": len(analysis.causas)})
    return analysis


@router.post("/explicar-recibo", response_model=ExplanationResponse, dependencies=[Depends(require_auth)], tags=["analisis"])
def explain_invoice(payload: ExplainRequest, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> ExplanationResponse:
    analysis = billing_engine.analyze(db, payload.customer_key)
    explanation, generated_by = AIExplainer(settings).explain(analysis, use_ai=payload.use_ai)
    return ExplanationResponse(customer_key=payload.customer_key, analysis=analysis, explanation=explanation, generated_by=generated_by)


@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(require_auth)], tags=["conversaciones"])
def chat(payload: ChatRequest, db: Session = Depends(get_db)) -> ChatResponse:
    conversation, turn = ConversationService().chat(
        db, payload.customer_key, payload.message, payload.conversation_id, payload.channel
    )
    return ChatResponse(
        conversation_id=conversation.id,
        answer=turn.answer,
        text=turn.answer,
        analysis=turn.analysis,
        breakdown=turn.breakdown,
        actions=turn.actions,
        cross_sell_offer=turn.cross_sell_offer,
        handoff=turn.handoff,
        closing_reminder=turn.closing_reminder,
        tone=turn.tone,
        generated_by=turn.generated_by,
    )


@router.get("/conversaciones/{conversation_id}", response_model=ConversationOut, dependencies=[Depends(require_auth)], tags=["conversaciones"])
def conversation_history(conversation_id: uuid.UUID, db: Session = Depends(get_db)) -> Conversation:
    conversation = db.scalar(select(Conversation).options(selectinload(Conversation.messages)).where(Conversation.id == conversation_id))
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    return conversation
