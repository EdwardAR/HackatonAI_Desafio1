import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UUIDMixin:
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


class Customer(UUIDMixin, Base):
    __tablename__ = "clientes"

    customer_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    financial_account: Mapped[str] = mapped_column(String(64), index=True)
    subscriber_key: Mapped[str] = mapped_column(String(64), index=True)
    telefono_hash: Mapped[str] = mapped_column(String(128), unique=True)
    fecha_activacion: Mapped[date] = mapped_column(Date)
    lob_type: Mapped[str] = mapped_column(String(40))
    negocio: Mapped[str] = mapped_column(String(80))
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="customer", cascade="all, delete-orphan")


class Invoice(UUIDMixin, Base):
    __tablename__ = "facturas"
    __table_args__ = (Index("ix_facturas_cliente_periodo", "customer_id", "period_end"),)

    numero_recibo: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    customer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clientes.id", ondelete="CASCADE"), index=True)
    customer_key: Mapped[str] = mapped_column(String(64), index=True)
    subscriber_key: Mapped[str] = mapped_column(String(64), index=True)
    billing_arrangement_key: Mapped[str] = mapped_column(String(64), index=True)
    financial_account_key: Mapped[str] = mapped_column(String(64), index=True)
    ciclo: Mapped[str] = mapped_column(String(16))
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date, index=True)
    importe_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    importe_neto: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    customer: Mapped[Customer] = relationship(back_populates="invoices")
    details: Mapped[list["InvoiceDetail"]] = relationship(back_populates="invoice", cascade="all, delete-orphan")


class InvoiceDetail(UUIDMixin, Base):
    __tablename__ = "detalle_factura"
    factura_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("facturas.id", ondelete="CASCADE"), index=True)
    charge_code: Mapped[str] = mapped_column(String(64), index=True)
    charge_desc: Mapped[str] = mapped_column(String(200))
    charge_classification: Mapped[str] = mapped_column(String(80))
    grupo: Mapped[str] = mapped_column(String(80), index=True)
    subgrupo: Mapped[str] = mapped_column(String(80))
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    invoice: Mapped[Invoice] = relationship(back_populates="details")


class OfferCatalog(UUIDMixin, Base):
    __tablename__ = "catalogo_ofertas"
    charge_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    rate_final: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    tipo_renta: Mapped[str] = mapped_column(String(80))


class Order(UUIDMixin, Base):
    __tablename__ = "ordenes"
    subscriber_key: Mapped[str] = mapped_column(String(64), index=True)
    customer_key: Mapped[str] = mapped_column(String(64), index=True)
    fecha_inicio: Mapped[date] = mapped_column(Date, index=True)
    fecha_fin: Mapped[date | None] = mapped_column(Date, nullable=True)
    motivo: Mapped[str] = mapped_column(String(160))
    motivo_id: Mapped[str] = mapped_column(String(64))
    tipo_orden: Mapped[str] = mapped_column(String(80))
    estado: Mapped[str] = mapped_column(String(40))


class CreditNote(UUIDMixin, Base):
    __tablename__ = "notas_credito"
    customer_key: Mapped[str] = mapped_column(String(64), index=True)
    subscriber_key: Mapped[str] = mapped_column(String(64), index=True)
    charge_code: Mapped[str] = mapped_column(String(64))
    tipo_nota: Mapped[str] = mapped_column(String(40))
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    fecha: Mapped[date] = mapped_column(Date, index=True)


class Discount(UUIDMixin, Base):
    __tablename__ = "descuentos"
    billing_arrangement: Mapped[str] = mapped_column(String(64), index=True)
    cuenta_financiera: Mapped[str] = mapped_column(String(64), index=True)
    telefono_hash: Mapped[str] = mapped_column(String(128))
    fecha_inicio: Mapped[date] = mapped_column(Date)
    fecha_fin: Mapped[date] = mapped_column(Date, index=True)
    porcentaje: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    monto_descuento: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    tipo_descuento: Mapped[str] = mapped_column(String(80))
    descripcion: Mapped[str] = mapped_column(String(200))


class Proration(UUIDMixin, Base):
    __tablename__ = "prorrateos"
    ba: Mapped[str] = mapped_column(String(64), index=True)
    cuenta_financiera: Mapped[str] = mapped_column(String(64), index=True)
    recibo: Mapped[str] = mapped_column(String(64), index=True)
    ciclo: Mapped[str] = mapped_column(String(16))
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    cantidad_cargos: Mapped[int]


class Reconnection(UUIDMixin, Base):
    __tablename__ = "reconexiones"
    customer_key: Mapped[str] = mapped_column(String(64), index=True)
    recibo: Mapped[str] = mapped_column(String(64), index=True)
    fecha_reconexion: Mapped[date] = mapped_column(Date)
    fecha_corte: Mapped[date] = mapped_column(Date)
    monto: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    descripcion: Mapped[str] = mapped_column(String(200))


class Conversation(UUIDMixin, Base):
    __tablename__ = "conversaciones"
    customer_key: Mapped[str] = mapped_column(String(64), index=True)
    channel: Mapped[str] = mapped_column(String(30), default="web")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class Message(UUIDMixin, Base):
    __tablename__ = "mensajes"
    conversation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("conversaciones.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class AuditLog(UUIDMixin, Base):
    __tablename__ = "audit_logs"
    customer_key: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    actor: Mapped[str] = mapped_column(String(80))
    action: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    outcome: Mapped[str] = mapped_column(String(20))
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
