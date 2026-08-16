"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, BadgeCheck, CheckCircle2, FileCheck2, Home, LogOut, Menu, MessageCircleMore, ReceiptText, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import { Badge, Button, Card } from "./ui";
import { Chat } from "./Chat";
import { clearDemoSession } from "../lib/demo-session";

type Customer = { customer_key: string; display_name: string; demo_phone: string; scenario: string; cause_label: string; variation: string };
type Evidence = { table: string; record_id: string; field: string; value: string };
type Cause = { id: string; tipo: string; impacto: string; explicacion: string; evidencia: Evidence[] };
type Analysis = {
  cliente: string; numero_recibo: string; ciclo_actual: string; recibo_actual: string; recibo_anterior: string | null;
  variacion: string; variacion_porcentaje: string | null; reconciliado: boolean;
  tendencia: { ciclo: string; period_end: string; importe_total: string }[]; causas: Cause[];
};

const fallbackCustomers: Customer[] = [
  { customer_key: "CUST-DEMO-RECON", display_name: "Marco T.", demo_phone: "999000002", scenario: "Reconexión", cause_label: "Reconexión", variation: "15.00" },
  { customer_key: "CUST-DEMO-PRORATE", display_name: "Lucía V.", demo_phone: "999000003", scenario: "Prorrateo", cause_label: "Prorrateo + cambio de plan", variation: "15.00" },
  { customer_key: "CUST-DEMO-DISCOUNT", display_name: "Diego S.", demo_phone: "999000004", scenario: "Fin de descuento", cause_label: "Fin de descuento", variation: "20.00" },
];

function money(value: number) { return `S/${Math.abs(value).toFixed(2)}`; }

export function BillingDashboard() {
  const [mobileNav, setMobileNav] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>(fallbackCustomers);
  const [customerKey, setCustomerKey] = useState("CUST-DEMO-RECON");
  const [analysis, setAnalysis] = useState<Analysis>();
  const [selectedCause, setSelectedCause] = useState<Cause>();
  const [analysisStatus, setAnalysisStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);
  const customer = customers.find((item) => item.customer_key === customerKey) ?? customers[0];
  const pitchCustomers = customers.filter((item) => item.customer_key !== "CUST-DEMO-001");

  useEffect(() => {
    fetch("/api/customers").then((response) => response.ok ? response.json() : fallbackCustomers).then((data: Customer[]) => {
      if (Array.isArray(data) && data.length) { setCustomers(data); setCustomerKey((current) => data.some((item) => item.customer_key === current) ? current : data[0].customer_key); }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch(`/api/analysis?customer_key=${encodeURIComponent(customerKey)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("API unavailable")))
      .then((data: Analysis) => { setAnalysis(data); setAnalysisStatus("ready"); })
      .catch(() => { setAnalysis(undefined); setAnalysisStatus("error"); });
  }, [customerKey, retryKey]);

  useEffect(() => {
    if (!selectedCause) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedCause(undefined); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedCause]);

  const current = Number(analysis?.recibo_actual ?? 0);
  const previous = Number(analysis?.recibo_anterior ?? 0);
  const variation = Number(analysis?.variacion ?? 0);
  const chart = analysis?.tendencia.map((item) => ({ cycle: item.ciclo.slice(5), total: Number(item.importe_total) })) ?? [];
  const average = chart.length ? chart.reduce((sum, item) => sum + item.total, 0) / chart.length : 0;
  const loading = analysisStatus === "loading" || !analysis || analysis.cliente !== customerKey;
  const primaryCause = analysis?.causas[0];

  const selectCustomer = (key: string) => {
    if (key === customerKey) return;
    setAnalysis(undefined);
    setAnalysisStatus("loading");
    setCustomerKey(key);
  };

  const retry = () => { setAnalysisStatus("loading"); setRetryKey((value) => value + 1); };

  const logout = () => { clearDemoSession(window.sessionStorage); window.location.assign("/"); };

  return <main className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark">C</span><span>ClarIA</span></div>
      <button className="nav-close" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><X /></button>
      <nav aria-label="Navegación principal">
        <a className="nav-item active" href="#resumen"><Home size={19} /> Resumen</a>
        <a className="nav-item" href="#causas"><ReceiptText size={19} /> Mi recibo</a>
        <a className="nav-item" href="#chat"><MessageCircleMore size={19} /> Conversación</a>
        <Link className="nav-item" href="/whatsapp"><MessageCircleMore size={19} /> Demo WhatsApp</Link>
      </nav>
      <div className="sidebar-trust"><ShieldCheck size={19} /><div><strong>Datos demo protegidos</strong><span>Sin PII en el navegador</span></div></div>
      <button className="profile" onClick={logout} aria-label="Cerrar sesión"><span className="avatar">{customer?.display_name.slice(0, 2).toUpperCase()}</span><span><strong>{customer?.display_name}</strong><small>{customer?.scenario}</small></span><LogOut size={16} /></button>
    </aside>

    <section className="workspace">
      <header className="topbar">
        <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu /></button>
        <div><p className="eyebrow">APP MI MOVISTAR · DEMO</p><h1>Hola, {customer?.display_name}</h1></div>
        <Link className="topbar-channel" href="/whatsapp"><MessageCircleMore size={17}/><span><small>SEGUNDO CANAL</small><strong>Abrir WhatsApp</strong></span><ArrowRight size={15}/></Link>
      </header>

      <div className="content" id="resumen">
        <section className="scenario-switcher" aria-labelledby="scenario-title">
          <div className="scenario-switcher-head"><div><p className="eyebrow">CONTROL DE DEMOSTRACIÓN</p><h2 id="scenario-title">Elige el caso que verá el jurado</h2></div><span><CheckCircle2 size={15}/> Datos sintéticos aislados</span></div>
          <div className="scenario-options">{pitchCustomers.map((item, index) => <button key={item.customer_key} onClick={() => selectCustomer(item.customer_key)} className={item.customer_key === customerKey ? "active" : ""} aria-pressed={item.customer_key === customerKey}>
            <span className="scenario-index">0{index + 1}</span><span className="scenario-card-copy"><small>{item.customer_key}</small><strong>{item.scenario}</strong><em>{item.cause_label}</em></span><b>+{money(Number(item.variation))}</b><i>{item.customer_key === customerKey ? "Activo" : "Probar caso"}</i>
          </button>)}</div>
        </section>

        {analysisStatus === "error" && <section className="analysis-error" role="alert"><span><RefreshCw/></span><div><p className="eyebrow">NO PUDIMOS CARGAR EL CASO</p><h2>El motor de análisis no respondió</h2><p>Verifica que FastAPI esté encendido. La cuenta seleccionada permanece aislada y puedes reintentar sin perder la sesión demo.</p></div><button onClick={retry}><RefreshCw size={16}/> Reintentar análisis</button></section>}

        {loading && analysisStatus !== "error" && <section className="dashboard-skeleton" aria-label="Cargando análisis" role="status"><div className="skeleton-line short"/><div className="skeleton-line title"/><div className="skeleton-line amount"/><div className="skeleton-grid"><i/><i/><i/></div><span className="sr-only">Cargando el análisis verificable del escenario.</span></section>}

        {analysis && analysisStatus === "ready" && <><section className="hero-card" aria-busy={loading}>
          <div className="hero-copy">
            <Badge tone="good"><BadgeCheck size={14} /> {analysis?.reconciliado ? "Análisis conciliado" : "Análisis pendiente"}</Badge>
            <p className="hero-kicker">RESPUESTA PRINCIPAL · {analysis.ciclo_actual}</p>
            <h2 className="change-answer">Tu recibo {variation >= 0 ? "subió" : "bajó"} <span>{money(variation)}</span> por {primaryCause?.tipo.replaceAll("_", " ").toLowerCase() ?? "cambios verificados"}.</h2>
            <p className="hero-summary">Comparamos seis ciclos y encontramos <strong>{analysis.causas.length} {analysis.causas.length === 1 ? "causa respaldada" : "causas respaldadas"}</strong>. El cambio cuadra con los registros del recibo.</p>
            <div className="hero-actions-dashboard"><Button onClick={() => document.querySelector("#causas")?.scrollIntoView({ behavior: "smooth" })}>Ver evidencia <ArrowRight size={17} /></Button><button onClick={() => document.querySelector("#chat")?.scrollIntoView({ behavior: "smooth" })}>Conversar con ClarIA</button></div>
          </div>
          <div className="reconcile-card">
            <p className="receipt-total-label">TOTAL DEL RECIBO</p><div className="amount">S/{current.toFixed(0)}<span>.{current.toFixed(2).split(".")[1]}</span></div>
            <div className="reconcile-head"><span>Variación explicada</span><strong>{analysis.reconciliado ? "100%" : "—"}</strong></div>
            <div className="progress"><span style={{ width: analysis.reconciliado ? "100%" : "0%" }} /></div>
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
          <div className="cause-grid">{analysis.causas.map((cause, index) => { const evidenceDate = cause.evidencia.find((item) => item.field.includes("fecha"))?.value ?? analysis.ciclo_actual; return <button className="cause-card" key={cause.id} onClick={() => setSelectedCause(cause)}><span className={`cause-icon cause-${index}`}><ReceiptText size={20}/></span><span className="cause-number">0{index + 1}</span><small className="cause-date">REGISTRO · {evidenceDate}</small><strong>{cause.tipo.replaceAll("_", " ")}</strong><span className="cause-description">{cause.explicacion}</span><span className="cause-bottom"><b>{Number(cause.impacto) >= 0 ? "+" : "−"}{money(Number(cause.impacto))}</b><em>Ver evidencia <ArrowRight size={15}/></em></span></button>; })}</div>
        </section>

        <section className="chat-section" id="chat">
          <div className="chat-intro"><span className="ai-orb"><Sparkles /></span><p className="eyebrow">MOTOR OMNICANAL</p><h2>Pregunta por este recibo</h2><p>Este mismo componente y contrato se usan en la experiencia WhatsApp. Las acciones, ofertas y derivación vienen decididas por el backend.</p></div>
          <Chat key={customerKey} customerKey={customerKey} displayName={customer?.display_name ?? "cliente"} autoStart />
        </section>
        </>}
      </div>
    </section>

    {selectedCause && <div className="modal-backdrop"><button className="modal-dismiss" onClick={() => setSelectedCause(undefined)} aria-label="Cerrar evidencia"/><div className="evidence-modal" role="dialog" aria-modal="true" aria-labelledby="evidence-title"><button className="modal-close" onClick={() => setSelectedCause(undefined)} aria-label="Cerrar"><X/></button><Badge tone="good"><ShieldCheck size={14}/> Evidencia verificada</Badge><h2 id="evidence-title">{selectedCause.tipo.replaceAll("_", " ")}</h2><p>{selectedCause.explicacion}</p>{selectedCause.evidencia.map((item) => <div className="evidence-data" key={`${item.table}-${item.record_id}-${item.field}`}><span>{item.table} · {item.field}</span><strong>{item.value}</strong></div>)}<p className="modal-foot"><ShieldCheck size={15}/> El importe proviene del motor analítico, no de la IA.</p></div></div>}
  </main>;
}
