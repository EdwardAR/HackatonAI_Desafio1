import uuid
from dataclasses import dataclass
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Conversation, Invoice, InvoiceDetail, Message, OfferCatalog
from app.schemas.billing import BillingAnalysis, BreakdownItem, CrossSellOffer, Handoff
from app.services.ai_explainer import AIExplainer
from app.services.billing_engine import BillingEngine
from app.services.knowledge_service import KnowledgeService


@dataclass
class ConversationTurn:
    answer: str
    analysis: BillingAnalysis
    breakdown: list[BreakdownItem]
    actions: list[str]
    cross_sell_offer: CrossSellOffer | None
    handoff: Handoff | None
    closing_reminder: str | None
    tone: str
    generated_by: str


class ConversationService:
    HANDOFF_WORDS = ("asesor", "reclamo", "no reconozco", "fraude", "robo", "denuncia")
    ANGRY_WORDS = ("molesto", "indignado", "estafa", "terrible", "pésimo", "pesimo")
    CONFUSED_WORDS = ("no entiendo", "confund", "duda", "por qué", "porque")
    PAYMENT_WORDS = ("cómo pago", "como pago", "pagar", "medios de pago", "dónde pago", "donde pago")
    CLOSING_WORDS = ("gracias", "entendido", "listo", "quedó claro", "quedo claro")

    def __init__(self, billing: BillingEngine | None = None, explainer: AIExplainer | None = None, knowledge: KnowledgeService | None = None) -> None:
        self.billing = billing or BillingEngine()
        self.explainer = explainer or AIExplainer()
        self.knowledge = knowledge or KnowledgeService()

    def chat(
        self,
        db: Session,
        customer_key: str,
        message: str,
        conversation_id: uuid.UUID | None = None,
        channel: str = "web",
    ) -> tuple[Conversation, ConversationTurn]:
        conversation = self._conversation(db, customer_key, conversation_id, channel)
        analysis = self.billing.analyze(db, customer_key)
        normalized = message.lower().strip()
        tone = self._tone(normalized)
        if any(word in normalized for word in self.HANDOFF_WORDS):
            turn = self._handoff_turn(analysis, message, tone)
        elif any(word in normalized for word in self.PAYMENT_WORDS):
            turn = self._knowledge_turn(analysis, message, tone)
        else:
            turn = self._billing_turn(db, analysis, normalized, tone)

        db.add_all([
            Message(conversation_id=conversation.id, role="user", content=message),
            Message(conversation_id=conversation.id, role="assistant", content=turn.answer),
        ])
        db.commit()
        db.refresh(conversation)
        return conversation, turn

    @staticmethod
    def _conversation(db: Session, customer_key: str, conversation_id: uuid.UUID | None, channel: str) -> Conversation:
        conversation = None
        if conversation_id:
            conversation = db.scalar(select(Conversation).where(Conversation.id == conversation_id, Conversation.customer_key == customer_key))
            if not conversation:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversación no encontrada")
        if not conversation:
            conversation = Conversation(customer_key=customer_key, channel=channel)
            db.add(conversation)
            db.flush()
        return conversation

    def _billing_turn(self, db: Session, analysis: BillingAnalysis, message: str, tone: str) -> ConversationTurn:
        answer, generated_by = self.explainer.explain(analysis)
        if tone == "molesto":
            answer = "Entiendo que este cambio sea incómodo. Revisé los registros antes de responderte.\n\n" + answer
        elif tone == "confundido":
            answer = "Te lo explico paso a paso y con los importes verificados.\n\n" + answer
        resolved = analysis.reconciliado and bool(analysis.causas)
        offer = self._cross_sell(db, analysis) if resolved else None
        actions = ["pagar", "ver_detalle"] if resolved else ["ver_detalle", "derivar_asesor"]
        if offer:
            actions.append("cross_sell")
        closing = self._closing_reminder() if resolved and any(word in message for word in self.CLOSING_WORDS) else None
        return ConversationTurn(answer, analysis, self._breakdown(analysis), actions, offer, None, closing, tone, generated_by)

    def _knowledge_turn(self, analysis: BillingAnalysis, message: str, tone: str) -> ConversationTurn:
        hit = self.knowledge.search(message)
        answer = hit.content if hit else "Puedes pagar desde la app Mi Movistar, banca móvil o agentes autorizados. Verifica el monto y el número de recibo antes de confirmar."
        return ConversationTurn(answer, analysis, [], ["pagar", "ver_detalle"], None, None, None, tone, "knowledge-retrieval")

    @staticmethod
    def _handoff_turn(analysis: BillingAnalysis, message: str, tone: str) -> ConversationTurn:
        causes = ", ".join(cause.tipo for cause in analysis.causas) or "sin causa concluyente"
        handoff = Handoff(
            reason="El cliente solicitó revisión humana o reportó un cargo no reconocido.",
            context={
                "consulta": message,
                "recibo": analysis.numero_recibo,
                "variacion": str(analysis.variacion),
                "causas_detectadas": causes,
                "estado_del_analisis": "reconciliado" if analysis.reconciliado else "requiere revisión",
            },
        )
        answer = "Voy a derivarte con un asesor. Ya preparé el contexto de tu recibo para que no tengas que repetir la información."
        return ConversationTurn(answer, analysis, [], ["derivar_asesor"], None, handoff, None, tone, "deterministic-handoff")

    @staticmethod
    def _breakdown(analysis: BillingAnalysis) -> list[BreakdownItem]:
        items: list[BreakdownItem] = []
        for cause in analysis.causas[:3]:
            date = next((e.value for e in cause.evidencia if "fecha" in e.field), analysis.ciclo_actual)
            previous = -abs(cause.impacto) if cause.tipo == "FIN_DESCUENTO" else Decimal("0.00")
            items.append(BreakdownItem(concept=cause.explicacion, amount=cause.impacto, previous_amount=previous, date=date, evidence=cause.evidencia))
        return items

    @staticmethod
    def _tone(message: str) -> str:
        if any(word in message for word in ConversationService.ANGRY_WORDS):
            return "molesto"
        if any(word in message for word in ConversationService.CONFUSED_WORDS):
            return "confundido"
        return "neutral"

    @staticmethod
    def _cross_sell(db: Session, analysis: BillingAnalysis) -> CrossSellOffer | None:
        cause_types = {cause.tipo for cause in analysis.causas}
        if "RECONEXION" in cause_types:
            active_bonus = db.scalar(
                select(InvoiceDetail.id)
                .join(Invoice, Invoice.id == InvoiceDetail.factura_id)
                .where(
                    Invoice.customer_key == analysis.cliente,
                    Invoice.ciclo == analysis.ciclo_actual,
                    or_(InvoiceDetail.grupo.ilike("%BONO%"), InvoiceDetail.subgrupo.ilike("%BONO%")),
                )
                .limit(1)
            )
            if active_bonus:
                return None
            offer_type, title, description = "BONO_DATOS", "Bono de 2 GB", "Datos adicionales por 30 días. Se ofrece solo después de resolver tu consulta."
        elif "FIN_DESCUENTO" in cause_types:
            offer_type, title, description = "FIDELIZACION", "Plan fidelidad 95", "Alternativa vigente del mismo grupo de renta mensual después del fin de la promoción."
        else:
            return None
        offer = db.scalar(select(OfferCatalog).where(OfferCatalog.tipo_renta == offer_type).order_by(OfferCatalog.rate_final))
        if not offer:
            return None
        return CrossSellOffer(title=title, description=description, price=offer.rate_final, source_offer_code=offer.charge_code)

    @staticmethod
    def _closing_reminder() -> str:
        return "Antes de irte: tu plan incluye llamadas ilimitadas y acceso a beneficios en la app Mi Movistar."
