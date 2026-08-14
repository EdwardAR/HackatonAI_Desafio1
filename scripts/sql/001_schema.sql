CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_key varchar(64) UNIQUE NOT NULL,
  financial_account varchar(64) NOT NULL, subscriber_key varchar(64) NOT NULL,
  telefono_hash varchar(128) UNIQUE NOT NULL, fecha_activacion date NOT NULL,
  lob_type varchar(40) NOT NULL, negocio varchar(80) NOT NULL
);
CREATE TABLE IF NOT EXISTS facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), numero_recibo varchar(64) UNIQUE NOT NULL,
  customer_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE, customer_key varchar(64) NOT NULL,
  subscriber_key varchar(64) NOT NULL, billing_arrangement_key varchar(64) NOT NULL,
  financial_account_key varchar(64) NOT NULL, ciclo varchar(16) NOT NULL,
  period_start date NOT NULL, period_end date NOT NULL, importe_total numeric(12,2) NOT NULL,
  importe_neto numeric(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_facturas_cliente_periodo ON facturas(customer_id, period_end DESC);
CREATE TABLE IF NOT EXISTS detalle_factura (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), factura_id uuid NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  charge_code varchar(64) NOT NULL, charge_desc varchar(200) NOT NULL,
  charge_classification varchar(80) NOT NULL, grupo varchar(80) NOT NULL,
  subgrupo varchar(80) NOT NULL, monto numeric(12,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS catalogo_ofertas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), charge_code varchar(64) UNIQUE NOT NULL, rate_final numeric(12,2) NOT NULL, tipo_renta varchar(80) NOT NULL);
CREATE TABLE IF NOT EXISTS ordenes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subscriber_key varchar(64) NOT NULL, customer_key varchar(64) NOT NULL, fecha_inicio date NOT NULL, fecha_fin date, motivo varchar(160) NOT NULL, motivo_id varchar(64) NOT NULL, tipo_orden varchar(80) NOT NULL, estado varchar(40) NOT NULL);
CREATE TABLE IF NOT EXISTS notas_credito (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_key varchar(64) NOT NULL, subscriber_key varchar(64) NOT NULL, charge_code varchar(64) NOT NULL, tipo_nota varchar(40) NOT NULL, monto numeric(12,2) NOT NULL, fecha date NOT NULL);
CREATE TABLE IF NOT EXISTS descuentos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), billing_arrangement varchar(64) NOT NULL, cuenta_financiera varchar(64) NOT NULL, telefono_hash varchar(128) NOT NULL, fecha_inicio date NOT NULL, fecha_fin date NOT NULL, porcentaje numeric(5,2), monto_descuento numeric(12,2) NOT NULL, tipo_descuento varchar(80) NOT NULL, descripcion varchar(200) NOT NULL);
CREATE TABLE IF NOT EXISTS prorrateos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ba varchar(64) NOT NULL, cuenta_financiera varchar(64) NOT NULL, recibo varchar(64) NOT NULL, ciclo varchar(16) NOT NULL, monto numeric(12,2) NOT NULL, cantidad_cargos integer NOT NULL);
CREATE TABLE IF NOT EXISTS reconexiones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_key varchar(64) NOT NULL, recibo varchar(64) NOT NULL, fecha_reconexion date NOT NULL, fecha_corte date NOT NULL, monto numeric(12,2) NOT NULL, descripcion varchar(200) NOT NULL);
CREATE TABLE IF NOT EXISTS conversaciones (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_key varchar(64) NOT NULL, channel varchar(30) NOT NULL DEFAULT 'web', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS mensajes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES conversaciones(id) ON DELETE CASCADE, role varchar(20) NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_key varchar(64), actor varchar(80) NOT NULL, action varchar(80) NOT NULL, resource_id varchar(64), outcome varchar(20) NOT NULL, metadata_json text NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
