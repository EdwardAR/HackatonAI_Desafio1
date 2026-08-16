"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, LockKeyhole, MessageCircleMore, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Chat } from "./Chat";

type Customer = { customer_key: string; display_name: string; demo_phone: string; scenario: string; cause_label: string; variation: string };
const fallback: Customer[] = [
  { customer_key: "CUST-DEMO-RECON", display_name: "Marco T.", demo_phone: "999000002", scenario: "Reconexión", cause_label: "Reconexión", variation: "15.00" },
  { customer_key: "CUST-DEMO-PRORATE", display_name: "Lucía V.", demo_phone: "999000003", scenario: "Prorrateo", cause_label: "Prorrateo + cambio de plan", variation: "15.00" },
  { customer_key: "CUST-DEMO-DISCOUNT", display_name: "Diego S.", demo_phone: "999000004", scenario: "Fin de descuento", cause_label: "Fin de descuento", variation: "20.00" },
];

export function WhatsAppDemo() {
  const [customers, setCustomers] = useState(fallback);
  const [customerKey, setCustomerKey] = useState(fallback[0].customer_key);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const customer = useMemo(() => customers.find((item) => item.customer_key === customerKey) ?? customers[0], [customers, customerKey]);
  const pitchCustomers = customers.filter((item) => item.customer_key !== "CUST-DEMO-001");

  useEffect(() => { fetch("/api/customers").then((response) => response.ok ? response.json() : fallback).then((data: Customer[]) => Array.isArray(data) && data.length && setCustomers(data)).catch(() => undefined); }, []);
  const verify = (event: FormEvent) => {
    event.preventDefault();
    const normalized = phone.replace(/\D/g, "");
    if (normalized !== customer.demo_phone || code !== "1234") {
      setError("El número o código demo no coincide con el cliente seleccionado.");
      return;
    }
    setError("");
    setVerified(true);
  };

  return <main className="wa-page">
    <div className="wa-phone">
      <header className="wa-header"><Link href="/" aria-label="Volver al inicio"><ArrowLeft/></Link><span className="wa-avatar"><MessageCircleMore/></span><div><strong>ClarIA Movistar</strong><small>en línea · canal simulado</small></div><em><ShieldCheck size={13}/> Seguro</em></header>
      {!verified ? <section className="wa-verify">
        <div className="wa-progress" aria-label="Paso previo al chat"><span className="active">1</span><i/><span>2</span><small>Verificación</small><small>Conversación</small></div>
        <span className="wa-lock"><LockKeyhole/></span><p className="eyebrow">VERIFICACIÓN SEGURA · DEMO</p><h1>Verifica tu línea</h1><p>Antes de mostrar montos, vinculamos esta conversación con una cuenta completamente sintética.</p>
        <form onSubmit={verify}>
          <label>Escenario<select value={customerKey} onChange={(event) => { setCustomerKey(event.target.value); setPhone(""); setCode(""); setVerified(false); setError(""); }}>{pitchCustomers.map((item) => <option value={item.customer_key} key={item.customer_key}>{item.scenario} · {item.display_name}</option>)}</select></label>
          <div className="wa-case-summary"><span><small>CASO SELECCIONADO</small><strong>{customer.cause_label}</strong></span><b>+S/{Number(customer.variation).toFixed(2)}</b></div>
          <button className="wa-autofill" type="button" onClick={() => { setPhone(customer.demo_phone); setCode("1234"); setError(""); }}><Sparkles size={15}/> Completar datos demo</button>
          <label>Número móvil demo<input inputMode="numeric" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 9))} placeholder={customer.demo_phone} aria-describedby="phone-help"/></label>
          <small id="phone-help">Número sintético: {customer.demo_phone}. Vive solo en memoria.</small>
          <label>Código de verificación<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234"/></label>
          <small>Código demo: <strong>1234</strong></small>
          {error && <p className="wa-error" role="alert">{error}</p>}
          <button className="wa-submit" type="submit">Verificar y conversar <ShieldCheck size={17}/></button>
        </form>
        <p className="wa-privacy"><CheckCircle2 size={14}/> No enviamos el teléfono al backend, logs ni almacenamiento.</p>
      </section> : <Chat key={customer.customer_key} customerKey={customer.customer_key} displayName={customer.display_name} channel="whatsapp" variant="whatsapp" autoStart />}
    </div>
  </main>;
}
