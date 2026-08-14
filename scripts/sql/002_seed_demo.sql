WITH new_customer AS (
  INSERT INTO clientes (customer_key, financial_account, subscriber_key, telefono_hash, fecha_activacion, lob_type, negocio)
  VALUES ('CUST-DEMO-001','FA-DEMO-9001','SUB-DEMO-7001','sha256:demo-only-5d41402abc4b2a76','2024-01-15','MOVIL','Hogar')
  ON CONFLICT (customer_key) DO UPDATE SET negocio = EXCLUDED.negocio
  RETURNING id
)
INSERT INTO facturas (numero_recibo, customer_id, customer_key, subscriber_key, billing_arrangement_key, financial_account_key, ciclo, period_start, period_end, importe_total, importe_neto)
SELECT 'REC-' || ciclo, (SELECT id FROM new_customer), 'CUST-DEMO-001', 'SUB-DEMO-7001', 'BA-DEMO-01', 'FA-DEMO-9001', ciclo, inicio, fin, total, total
FROM (VALUES
  ('2026-03','2026-03-01'::date,'2026-03-31'::date,80.00),
  ('2026-04','2026-04-01'::date,'2026-04-30'::date,80.00),
  ('2026-05','2026-05-01'::date,'2026-05-31'::date,80.00),
  ('2026-06','2026-06-01'::date,'2026-06-30'::date,80.00),
  ('2026-07','2026-07-01'::date,'2026-07-31'::date,80.00),
  ('2026-08','2026-08-01'::date,'2026-08-31'::date,120.00)
) AS demo(ciclo,inicio,fin,total)
ON CONFLICT (numero_recibo) DO NOTHING;

INSERT INTO detalle_factura (factura_id,charge_code,charge_desc,charge_classification,grupo,subgrupo,monto)
SELECT f.id,'PLAN-100','Plan Movistar Total','RENTA','PLAN','RENTA_MENSUAL',100
FROM facturas f WHERE f.customer_key='CUST-DEMO-001'
AND NOT EXISTS (SELECT 1 FROM detalle_factura d WHERE d.factura_id=f.id AND d.charge_code='PLAN-100');
INSERT INTO detalle_factura (factura_id,charge_code,charge_desc,charge_classification,grupo,subgrupo,monto)
SELECT f.id,'DISC-WELCOME','Descuento de bienvenida','DESCUENTO','DESCUENTOS','PROMOCION',-20
FROM facturas f WHERE f.customer_key='CUST-DEMO-001' AND f.ciclo <> '2026-08'
AND NOT EXISTS (SELECT 1 FROM detalle_factura d WHERE d.factura_id=f.id AND d.charge_code='DISC-WELCOME');
INSERT INTO detalle_factura (factura_id,charge_code,charge_desc,charge_classification,grupo,subgrupo,monto)
SELECT f.id,v.code,v.description,v.classification,v.group_name,v.subgroup_name,v.amount
FROM facturas f CROSS JOIN (VALUES
  ('RECONNECT','Cargo por reconexión','CARGO','SERVICIOS','RECONEXION',15.00),
  ('PRORATE','Ajuste proporcional','AJUSTE','AJUSTES','PRORRATEO',5.00)
) AS v(code,description,classification,group_name,subgroup_name,amount)
WHERE f.numero_recibo='REC-2026-08'
AND NOT EXISTS (SELECT 1 FROM detalle_factura d WHERE d.factura_id=f.id AND d.charge_code=v.code);
INSERT INTO catalogo_ofertas (charge_code,rate_final,tipo_renta)
VALUES ('PLAN-100',100,'MENSUAL') ON CONFLICT (charge_code) DO NOTHING;

INSERT INTO descuentos (billing_arrangement, cuenta_financiera, telefono_hash, fecha_inicio, fecha_fin, porcentaje, monto_descuento, tipo_descuento, descripcion)
SELECT 'BA-DEMO-01','FA-DEMO-9001','sha256:demo-only-5d41402abc4b2a76','2026-03-01','2026-07-31',20,20,'BIENVENIDA','el descuento de bienvenida'
WHERE NOT EXISTS (SELECT 1 FROM descuentos WHERE billing_arrangement='BA-DEMO-01' AND tipo_descuento='BIENVENIDA');
INSERT INTO prorrateos (ba,cuenta_financiera,recibo,ciclo,monto,cantidad_cargos)
SELECT 'BA-DEMO-01','FA-DEMO-9001','REC-2026-08','2026-08',5,1 WHERE NOT EXISTS (SELECT 1 FROM prorrateos WHERE recibo='REC-2026-08');
INSERT INTO reconexiones (customer_key,recibo,fecha_reconexion,fecha_corte,monto,descripcion)
SELECT 'CUST-DEMO-001','REC-2026-08','2026-08-12','2026-08-10',15,'Se aplicó un cargo por reconexión' WHERE NOT EXISTS (SELECT 1 FROM reconexiones WHERE recibo='REC-2026-08');
