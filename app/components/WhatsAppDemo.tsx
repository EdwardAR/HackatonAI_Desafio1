"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, LockKeyhole, MessageCircleMore, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Chat } from "./Chat";

type Customer = { customer_key: string; display_name: string; demo_phone: string; scenario: string };
const fallback: Customer[] = [
  { customer_key: "CUST-DEMO-RECON", display_name: "Marco T.", demo_phone: "999000002", scenario: "Reconexión" },
  { customer_key: "CUST-DEMO-PRORATE", display_name: "Lucía V.", demo_phone: "999000003", scenario: "Prorrateo" },
  { customer_key: "CUST-DEMO-DISCOUNT", display_name: "Diego S.", demo_phone: "999000004", scenario: "Fin de descuento" },
];

export function WhatsAppDemo() {
  const [customers, setCustomers] = useState(fallback);
  const [customerKey, setCustomerKey] = useState(fallback[0].customer_key);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");
  const customer = useMemo(() => customers.find((item) => item.customer_key === customerKey) ?? customers[0], [customers, customerKey]);

  useEffect(() => { fetch("/api/customers").then((response) => response.ok ? response.json() : fallback).then((data: Customer[]) => data.length && setCustomers(data)).catch(() => undefined); }, []);
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
      <header className="wa-header"><Link href="/" aria-label="Volver al inicio"><ArrowLeft/></Link><span className="wa-avatar"><MessageCircleMore/></span><div><strong>ClarIA Movistar</strong><small>en línea · canal simulado</small></div></header>
      {!verified ? <section className="wa-verify">
        <span className="wa-lock"><LockKeyhole/></span><p className="eyebrow">ZERO TRUST · DEMO</p><h1>Verifica tu línea</h1><p>Antes de mostrar montos, vinculamos esta conversación con una cuenta sintética.</p>
        <form onSubmit={verify}>
          <label>Escenario<select value={customerKey} onChange={(event) => { setCustomerKey(event.target.value); setPhone(""); setCode(""); setVerified(false); setError(""); }}>{customers.map((item) => <option value={item.customer_key} key={item.customer_key}>{item.scenario} · {item.display_name}</option>)}</select></label>
          <label>Número móvil demo<input inputMode="numeric" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 9))} placeholder={customer.demo_phone} aria-describedby="phone-help"/></label>
          <small id="phone-help">Para el pitch usa {customer.demo_phone}. Vive solo en memoria.</small>
          <label>Código de verificación<input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234"/></label>
          <small>Código demo: <strong>1234</strong></small>
          {error && <p className="wa-error" role="alert">{error}</p>}
          <button type="submit">Verificar y conversar <ShieldCheck size={17}/></button>
        </form>
        <p className="wa-privacy"><ShieldCheck size={14}/> No enviamos el teléfono al backend, logs ni almacenamiento.</p>
      </section> : <Chat customerKey={customer.customer_key} displayName={customer.display_name} channel="whatsapp" variant="whatsapp" autoStart />}
    </div>
  </main>;
}
