import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CustomerPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    customer_key: str
    fecha_activacion: date
    lob_type: str
    negocio: str


class InvoiceDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    charge_code: str
    charge_desc: str
    charge_classification: str
    grupo: str
    subgrupo: str
    monto: Decimal


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    numero_recibo: str
    ciclo: str
    period_start: date
    period_end: date
    importe_total: Decimal
    importe_neto: Decimal
    details: list[InvoiceDetailOut] = Field(default_factory=list)


class HistoryPoint(BaseModel):
    ciclo: str
    period_end: date
    importe_total: Decimal


class Evidence(BaseModel):
    table: str
    record_id: str
    field: str
    value: str


class Cause(BaseModel):
    id: str
    tipo: str
    impacto: Decimal
    explicacion: str
    evidencia: list[Evidence]


class BillingAnalysis(BaseModel):
    cliente: str
    numero_recibo: str
    ciclo_actual: str
    recibo_actual: Decimal
    recibo_anterior: Decimal | None
    variacion: Decimal
    variacion_porcentaje: Decimal | None
    tendencia: list[HistoryPoint]
    causas: list[Cause]
    reconciliado: bool
    moneda: str = "PEN"
    generated_at: datetime


class ExplainRequest(BaseModel):
    customer_key: str
    use_ai: bool = True


class ExplanationResponse(BaseModel):
    customer_key: str
    analysis: BillingAnalysis
    explanation: str
    generated_by: str


class ChatRequest(BaseModel):
    customer_key: str
    message: str = Field(min_length=1, max_length=1000)
    conversation_id: uuid.UUID | None = None


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    answer: str
    analysis: BillingAnalysis


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    role: str
    content: str
    created_at: datetime


class ConversationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    channel: str
    created_at: datetime
    messages: list[MessageOut]
