"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, BadgeCheck, ChevronDown, FileCheck2, Home, LogOut, Menu, MessageCircleMore, ReceiptText, ShieldCheck, Sparkles, X } from "lucide-react";
import { Badge, Button, Card } from "./ui";
import { Chat } from "./Chat";
import { clearDemoSession } from "../lib/demo-session";

type Customer = { customer_key: string; display_name: string; demo_phone: string; scenario: string };
type Evidence = { table: string; record_id: string; field: string; value: string };
type Cause = { id: string; tipo: string; impacto: string; explicacion: string; evidencia: Evidence[] };
type Analysis = {
  cliente: string; numero_recibo: string; ciclo_actual: string; recibo_actual: string; recibo_anterior: string | null;
  variacion: string; variacion_porcentaje: string | null; reconciliado: boolean;
  tendencia: { ciclo: string; period_end: string; importe_total: string }[]; causas: Cause[];
};

const fallbackCustomers: Customer[] = [
  { customer_key: "CUST-DEMO-RECON", display_name: "Marco T.", demo_phone: "999000002", scenario: "Reconexión" },
  { customer_key: "CUST-DEMO-PRORATE", display_name: "Lucía V.", demo_phone: "999000003", scenario: "Prorrateo" },
  { customer_key: "CUST-DEMO-DISCOUNT", display_name: "Diego S.", demo_phone: "999000004", scenario: "Fin de descuento" },
];

function money(value: number) { return `S/${Math.abs(value).toFixed(2)}`; }

export function BillingDashboard() {
  const [mobileNav, setMobileNav] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>(fallbackCustomers);
  const [customerKey, setCustomerKey] = useState("CUST-DEMO-RECON");
  const [analysis, setAnalysis] = useState<Analysis>();
  const [selectedCause, setSelectedCause] = useState<Cause>();
  const customer = customers.find((item) => item.customer_key === customerKey) ?? customers[0];

  useEffect(() => {
    fetch("/api/customers").then((response) => response.ok ? response.json() : fallbackCustomers).then((data: Customer[]) => {
      if (data.length) { setCustomers(data); setCustomerKey((current) => data.some((item) => item.customer_key === current) ? current : data[0].customer_key); }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch(`/api/analysis?customer_key=${encodeURIComponent(customerKey)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("API unavailable")))
      .then((data: Analysis) => setAnalysis(data))
      .catch(() => setAnalysis(undefined));
  }, [customerKey]);

  const current = Number(analysis?.recibo_actual ?? 0);
  const previous = Number(analysis?.recibo_anterior ?? 0);
  const variation = Number(analysis?.variacion ?? 0);
  const chart = analysis?.tendencia.map((item) => ({ cycle: item.ciclo.slice(5), total: Number(item.importe_total) })) ?? [];
  const average = chart.length ? chart.reduce((sum, item) => sum + item.total, 0) / chart.length : 0;
  const loading = !analysis || analysis.cliente !== customerKey;

  const logout = () => { clearDemoSession(window.sessionStorage); window.location.assign("/"); };

  return <main className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark">C</span><span>ClarIA</span></div>
      <button className="nav-close" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><X /></button>
      <nav aria-label="Navegación principal">
        <a className="nav-item active" href="#resumen"><Home size={19} /> Resumen</a>
        <a className="nav-item" href="#causas"><ReceiptText size={19} /> Mi recibo</a>
        <a className="nav-item" href="#chat"><MessageCircleMore size={19} /> Conversación</a>
        <a className="nav-item" href="/whatsapp"><MessageCircleMore size={19} /> Demo WhatsApp</a>
      </nav>
      <div className="sidebar-trust"><ShieldCheck size={19} /><div><strong>Datos demo protegidos</strong><span>Sin PII en el navegador</span></div></div>
      <button className="profile" onClick={logout} aria-label="Cerrar sesión"><span className="avatar">{customer?.display_name.slice(0, 2).toUpperCase()}</span><span><strong>{customer?.display_name}</strong><small>{customer?.scenario}</small></span><LogOut size={16} /></button>
    </aside>

    <section className="workspace">
      <header className="topbar">
        <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu /></button>
        <div><p className="eyebrow">APP MI MOVISTAR · DEMO</p><h1>Hola, {customer?.display_name}</h1></div>
        <label className="customer-picker"><span>Caso para el pitch</span><select value={customerKey} onChange={(event) => { setAnalysis(undefined); setCustomerKey(event.target.value); }} aria-label="Seleccionar cliente demo">{customers.map((item) => <option value={item.customer_key} key={item.customer_key}>{item.scenario} · {item.display_name}</option>)}</select><ChevronDown size={16}/></label>
      </header>

      <div className="content" id="resumen">
        {!analysis && <div className="api-warning" role="status">Cargando el análisis. Si no aparece, verifica que FastAPI esté encendido.</div>}
        <section className="hero-card" aria-busy={loading}>
          <div className="hero-copy">
            <Badge tone="good"><BadgeCheck size={14} /> {analysis?.reconciliado ? "Análisis conciliado" : "Análisis pendiente"}</Badge>
            <p className="hero-kicker">RECIBO · {analysis?.ciclo_actual ?? "CARGANDO"}</p>
            <div className="amount">S/{current.toFixed(0)}<span>.{current.toFixed(2).split(".")[1]}</span></div>
            <div className="delta"><ArrowRight size={16} /> {money(variation)} {variation >= 0 ? "más" : "menos"} que el ciclo anterior <span>{analysis?.variacion_porcentaje ?? "0"}%</span></div>
            <p className="hero-summary">Encontramos <strong>{analysis?.causas.length ?? 0} causas con evidencia</strong>. El lenguaje puede usar IA; los montos siempre salen del motor determinista.</p>
            <Button onClick={() => document.querySelector("#chat")?.scrollIntoView({ behavior: "smooth" })}>Explicar mi recibo <ArrowRight size={17} /></Button>
          </div>
          <div className="reconcile-card">
            <div className="reconcile-head"><span>Variación explicada</span><strong>{analysis?.reconciliado ? "100%" : "—"}</strong></div>
            <div className="progress"><span style={{ width: analysis?.reconciliado ? "100%" : "0%" }} /></div>
            <div className="reconcile-row"><span>Recibo anterior</span><strong>{money(previous)}</strong></div>
            <div className="reconcile-row"><span>Variación total</span><strong>{money(variation)}</strong></div>
            <div className="verified"><ShieldCheck size={17} /> Cuadre financiero verificable</div>
          </div>
        </section>

        <div className="grid-main">
          <Card className="trend-card"><div className="section-heading"><div><p className="eyebrow">ACTUAL + 5 CICLOS</p><h2>Tu facturación en el tiempo</h2></div><Badge>Promedio {money(average)}</Badge></div>
            <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8ecf2" strokeDasharray="4 4"/><XAxis dataKey="cycle" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `S/${value}`}/><Tooltip formatter={(value) => [money(Number(value)), "Total"]}/><Area type="monotone" dataKey="total" stroke="#1877f2" strokeWidth={3} fill="#d9ebff"/></AreaChart></ResponsiveContainer></div>
          </Card>
          <Card className="previous-card"><FileCheck2 size={22}/><p className="eyebrow">ESCENARIO ACTIVO</p><h2>{customer?.scenario}</h2><div className="previous-amount">{money(previous)}</div><p>Cambia de cliente para mostrar otro caso sin mezclar cuentas.</p><div className="stable"><span/> Identidad demo aislada</div></Card>
        </div>

        <section id="causas" className="causes-section">
          <div className="section-heading"><div><p className="eyebrow">DETALLE DE LA VARIACIÓN</p><h2>Causas detectadas</h2></div><span className="evidence-note"><ShieldCheck size={16}/> Solo evidencia persistida</span></div>
          <div className="cause-grid">{analysis?.causas.map((cause, index) => <button className="cause-card" key={cause.id} onClick={() => setSelectedCause(cause)}><span className={`cause-icon cause-${index}`}><ReceiptText size={20}/></span><span className="cause-number">0{index + 1}</span><strong>{cause.tipo.replaceAll("_", " ")}</strong><span className="cause-description">{cause.explicacion}</span><span className="cause-bottom"><b>{Number(cause.impacto) >= 0 ? "+" : "−"}{money(Number(cause.impacto))}</b><em>Ver evidencia <ArrowRight size={15}/></em></span></button>)}</div>
        </section>

        <section className="chat-section" id="chat">
          <div className="chat-intro"><span className="ai-orb"><Sparkles /></span><p className="eyebrow">MOTOR OMNICANAL</p><h2>Pregunta por este recibo</h2><p>Este mismo componente y contrato se usan en la experiencia WhatsApp. Las acciones, ofertas y derivación vienen decididas por el backend.</p></div>
          <Chat key={customerKey} customerKey={customerKey} displayName={customer?.display_name ?? "cliente"} autoStart />
        </section>
      </div>
    </section>

    {selectedCause && <div className="modal-backdrop"><button className="modal-dismiss" onClick={() => setSelectedCause(undefined)} aria-label="Cerrar evidencia"/><div className="evidence-modal" role="dialog" aria-modal="true" aria-labelledby="evidence-title"><button className="modal-close" onClick={() => setSelectedCause(undefined)} aria-label="Cerrar"><X/></button><Badge tone="good"><ShieldCheck size={14}/> Evidencia verificada</Badge><h2 id="evidence-title">{selectedCause.tipo.replaceAll("_", " ")}</h2><p>{selectedCause.explicacion}</p>{selectedCause.evidencia.map((item) => <div className="evidence-data" key={`${item.table}-${item.record_id}-${item.field}`}><span>{item.table} · {item.field}</span><strong>{item.value}</strong></div>)}<p className="modal-foot"><ShieldCheck size={15}/> El importe proviene del motor analítico, no de la IA.</p></div></div>}
  </main>;
}
