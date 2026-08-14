import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Conversation, Message
from app.schemas.billing import BillingAnalysis
from app.services.ai_explainer import AIExplainer
from app.services.billing_engine import BillingEngine


class ConversationService:
    def __init__(self, billing: BillingEngine | None = None, explainer: AIExplainer | None = None) -> None:
        self.billing = billing or BillingEngine()
        self.explainer = explainer or AIExplainer()

    def chat(
        self,
        db: Session,
        customer_key: str,
        message: str,
        conversation_id: uuid.UUID | None = None,
        channel: str = "web",
    ) -> tuple[Conversation, str, BillingAnalysis]:
        conversation = None
        if conversation_id:
            conversation = db.scalar(
                select(Conversation).where(Conversation.id == conversation_id, Conversation.customer_key == customer_key)
            )
            if not conversation:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversación no encontrada")
        if not conversation:
            conversation = Conversation(customer_key=customer_key, channel=channel)
            db.add(conversation)
            db.flush()

        analysis = self.billing.analyze(db, customer_key)
        answer, _ = self.explainer.explain(analysis)
        db.add_all(
            [
                Message(conversation_id=conversation.id, role="user", content=message),
                Message(conversation_id=conversation.id, role="assistant", content=answer),
            ]
        )
        db.commit()
        db.refresh(conversation)
        return conversation, answer, analysis
