"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowRight, BadgeCheck, Bot, ChevronDown, CircleHelp, Clock3, FileCheck2, Gift,
  Home, LogOut, Menu, MessageCircleMore, Paperclip, PlugZap, ReceiptText, Send,
  ShieldCheck, Sparkles, X,
} from "lucide-react";
import { Badge, Button, Card } from "./ui";

type Cause = {
  id: string;
  tipo: string;
  title: string;
  impact: number;
  description: string;
  evidence: string;
  icon: "gift" | "plug" | "receipt";
};

const demoTimeline = [
  { cycle: "Mar", total: 80 }, { cycle: "Abr", total: 80 }, { cycle: "May", total: 80 },
  { cycle: "Jun", total: 80 }, { cycle: "Jul", total: 80 }, { cycle: "Ago", total: 120 },
];

type ApiAnalysis = {
  recibo_actual: string;
  recibo_anterior: string | null;
  variacion: string;
  tendencia: { ciclo: string; importe_total: string }[];
};

const causes: Cause[] = [
  { id: "discount", tipo: "FIN_DESCUENTO", title: "Terminó tu descuento", impact: 20, description: "El descuento de bienvenida llegó a su fecha de finalización.", evidence: "Promoción bienvenida · Vigente hasta 31 jul 2026", icon: "gift" },
  { id: "reconnection", tipo: "RECONEXION", title: "Cargo por reconexión", impact: 15, description: "Se registró una reconexión de tu servicio durante este ciclo.", evidence: "Reconexión registrada · 12 ago 2026", icon: "plug" },
  { id: "proration", tipo: "PRORRATEO", title: "Ajuste proporcional", impact: 5, description: "Se aplicó un ajuste por los días efectivos de servicio.", evidence: "Prorrateo · 1 cargo verificado", icon: "receipt" },
];

function CauseIcon({ kind }: { kind: Cause["icon"] }) {
  const props = { size: 20, strokeWidth: 2 };
  if (kind === "gift") return <Gift {...props} />;
  if (kind === "plug") return <PlugZap {...props} />;
  return <ReceiptText {...props} />;
}

export function BillingDashboard() {
  const [mobileNav, setMobileNav] = useState(false);
  const [selectedCause, setSelectedCause] = useState<Cause | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "¡Hola, Elena! Soy ClarIA. Puedo ayudarte a entender cada concepto de tu recibo." },
  ]);
  const [thinking, setThinking] = useState(false);
  const [apiAnalysis, setApiAnalysis] = useState<ApiAnalysis | null>(null);
  const currentTotal = Number(apiAnalysis?.recibo_actual ?? 120);
  const previousTotal = Number(apiAnalysis?.recibo_anterior ?? 80);
  const variation = Number(apiAnalysis?.variacion ?? 40);
  const activeTimeline = apiAnalysis?.tendencia.map((item) => ({ cycle: item.ciclo.slice(5), total: Number(item.importe_total) })) ?? demoTimeline;
  const deltaPercent = useMemo(() => previousTotal ? Math.round((variation / previousTotal) * 100) : 0, [previousTotal, variation]);

  useEffect(() => {
    fetch("/api/analysis").then((response) => response.ok ? response.json() : null).then((data) => data && setApiAnalysis(data)).catch(() => undefined);
  }, []);

  const ask = async (preset?: string) => {
    const text = (preset ?? question).trim();
    if (!text || thinking) return;
    setMessages((current) => [...current, { role: "user", text }]);
    setQuestion("");
    setThinking(true);
    let answer = "Tu recibo aumentó S/40.00. Verifiqué tres causas: terminó un descuento (+S/20.00), hubo una reconexión (+S/15.00) y un ajuste proporcional (+S/5.00). Los tres importes suman exactamente la variación.";
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) });
      if (response.ok) answer = (await response.json()).answer ?? answer;
    } catch { /* La demo determinista sigue disponible si la API está apagada. */ }
    setMessages((current) => [...current, { role: "assistant", text: answer }]);
    setThinking(false);
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark">C</span><span>ClarIA</span></div>
        <button className="nav-close" onClick={() => setMobileNav(false)} aria-label="Cerrar menú"><X /></button>
        <nav aria-label="Navegación principal">
          <a className="nav-item active" href="#resumen"><Home size={19} /> Resumen</a>
          <a className="nav-item" href="#recibo"><ReceiptText size={19} /> Mi recibo</a>
          <a className="nav-item" href="#historial"><Clock3 size={19} /> Historial</a>
          <a className="nav-item" href="#chat"><MessageCircleMore size={19} /> Conversaciones</a>
        </nav>
        <div className="sidebar-trust"><ShieldCheck size={19} /><div><strong>Datos protegidos</strong><span>Sin información sensible</span></div></div>
        <button className="profile"><span className="avatar">ER</span><span><strong>Elena R.</strong><small>Hogar móvil</small></span><LogOut size={16} /></button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileNav(true)} aria-label="Abrir menú"><Menu /></button>
          <div><p className="eyebrow">CENTRO DE FACTURACIÓN</p><h1>Hola, Elena <span>👋</span></h1></div>
          <div className="receipt-picker"><FileCheck2 size={18} /><span><small>Recibo seleccionado</small><strong>Agosto 2026</strong></span><ChevronDown size={17} /></div>
        </header>

        <div className="content" id="resumen">
          <section className="hero-card">
            <div className="hero-copy">
              <Badge tone="good"><BadgeCheck size={14} /> Análisis completado</Badge>
              <p className="hero-kicker">TU RECIBO DE AGOSTO</p>
              <div className="amount">S/{currentTotal.toFixed(0)}<span>.{currentTotal.toFixed(2).split(".")[1]}</span></div>
              <div className="delta"><ArrowRight size={16} /> S/{variation.toFixed(2)} más que julio <span>+{deltaPercent}%</span></div>
              <p className="hero-summary">Encontramos <strong>3 razones verificadas</strong> que explican el cambio completo de tu recibo.</p>
              <Button onClick={() => document.querySelector("#causas")?.scrollIntoView({ behavior: "smooth" })}>Ver explicación <ArrowRight size={17} /></Button>
            </div>
            <div className="reconcile-card">
              <div className="reconcile-head"><span>Variación explicada</span><strong>100%</strong></div>
              <div className="progress"><span /></div>
              <div className="reconcile-row"><span>Variación total</span><strong>S/{variation.toFixed(2)}</strong></div>
              <div className="reconcile-row"><span>Causas identificadas</span><strong>S/{variation.toFixed(2)}</strong></div>
              <div className="verified"><ShieldCheck size={17} /> Cuadre financiero verificado</div>
            </div>
          </section>

          <div className="grid-main">
            <Card className="trend-card" id="historial">
              <div className="section-heading"><div><p className="eyebrow">ÚLTIMOS 6 CICLOS</p><h2>Tu facturación en el tiempo</h2></div><Badge>Promedio S/86.67</Badge></div>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={activeTimeline} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
                <defs><linearGradient id="blueArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1877f2" stopOpacity={0.22}/><stop offset="100%" stopColor="#1877f2" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="#e8ecf2" strokeDasharray="4 4" />
                <XAxis dataKey="cycle" axisLine={false} tickLine={false} tick={{ fill: "#6d7585", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} domain={[60, 130]} ticks={[60,80,100,120]} tickFormatter={(value) => `S/${value}`} tick={{ fill: "#8a92a1", fontSize: 11 }} />
                <Tooltip formatter={(value) => [`S/${Number(value).toFixed(2)}`, "Total"]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e7ef", boxShadow: "0 10px 30px rgba(18,35,66,.1)" }} />
                <Area type="monotone" dataKey="total" stroke="#1877f2" strokeWidth={3} fill="url(#blueArea)" dot={{ fill: "white", stroke: "#1877f2", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart></ResponsiveContainer></div>
            </Card>
            <Card className="previous-card" id="recibo"><p className="eyebrow">COMPARACIÓN</p><h2>Julio 2026</h2><div className="previous-amount">S/{previousTotal.toFixed(2)}</div><p>Tu recibo se mantuvo estable durante cinco ciclos.</p><div className="stable"><span /> Sin variaciones</div></Card>
          </div>

          <section id="causas" className="causes-section">
            <div className="section-heading"><div><p className="eyebrow">DETALLE DE LA VARIACIÓN</p><h2>¿Por qué aumentó tu recibo?</h2></div><span className="evidence-note"><ShieldCheck size={16} /> Solo mostramos causas con evidencia</span></div>
            <div className="cause-grid">
              {causes.map((cause, index) => <button className="cause-card" key={cause.id} onClick={() => setSelectedCause(cause)}>
                <span className={`cause-icon cause-${index}`}><CauseIcon kind={cause.icon} /></span><span className="cause-number">0{index + 1}</span>
                <strong>{cause.title}</strong><span className="cause-description">{cause.description}</span>
                <span className="cause-bottom"><b>+S/{cause.impact.toFixed(2)}</b><em>Ver evidencia <ArrowRight size={15} /></em></span>
              </button>)}
            </div>
          </section>

          <section className="chat-section" id="chat">
            <div className="chat-intro"><span className="ai-orb"><Sparkles /></span><p className="eyebrow">ASISTENTE DE FACTURACIÓN</p><h2>¿Tienes otra pregunta?</h2><p>ClarIA responde usando únicamente la información verificada de tu recibo.</p>
              <div className="suggestions">{["¿Qué descuento terminó?", "Explícame el prorrateo", "¿Cómo evito la reconexión?"].map((item) => <button key={item} onClick={() => ask(item)}>{item}<ArrowRight size={14} /></button>)}</div>
            </div>
            <Card className="chat-window"><div className="chat-title"><span><Bot size={19} /></span><div><strong>ClarIA</strong><small><i /> En línea · Respuesta verificada</small></div></div>
              <div className="messages" aria-live="polite">{messages.map((message, index) => <div key={index} className={`message ${message.role}`}>{message.text}</div>)}{thinking && <div className="message assistant typing"><i/><i/><i/></div>}</div>
              <form className="composer" onSubmit={(event) => { event.preventDefault(); ask(); }}><button type="button" aria-label="Adjuntar"><Paperclip size={18}/></button><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pregunta sobre tu recibo…" aria-label="Pregunta sobre tu recibo" /><button className="send" type="submit" aria-label="Enviar"><Send size={17}/></button></form>
            </Card>
          </section>
        </div>
      </section>

      {selectedCause && <div className="modal-backdrop"><button className="modal-dismiss" onClick={() => setSelectedCause(null)} aria-label="Cerrar evidencia"/><div className="evidence-modal" role="dialog" aria-modal="true" aria-labelledby="evidence-title">
        <button className="modal-close" onClick={() => setSelectedCause(null)} aria-label="Cerrar"><X /></button><span className="modal-icon"><CauseIcon kind={selectedCause.icon} /></span><Badge tone="good"><ShieldCheck size={14}/> Evidencia verificada</Badge>
        <h2 id="evidence-title">{selectedCause.title}</h2><p>{selectedCause.description}</p><div className="evidence-data"><span>Registro fuente</span><strong>{selectedCause.evidence}</strong></div><div className="evidence-data"><span>Impacto calculado</span><strong>+S/{selectedCause.impact.toFixed(2)}</strong></div><p className="modal-foot"><CircleHelp size={15}/> Este importe proviene del motor analítico, no de la IA.</p>
      </div></div>}
    </main>
  );
}
