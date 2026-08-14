"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight, BadgeCheck, BarChart3, Bot, Check, ChevronDown, FileCheck2, Gift,
  LockKeyhole, Menu, MessageCircleMore, PlugZap, ReceiptText, ShieldCheck,
  Smartphone, Sparkles, X, Zap,
} from "lucide-react";

const faqs = [
  { question: "¿ClarIA puede equivocarse con los importes?", answer: "Los importes y las causas provienen de registros de facturación y reglas verificables. La IA solo convierte esa información en una explicación sencilla." },
  { question: "¿Qué recibos puede revisar?", answer: "Compara el recibo actual con hasta cinco ciclos anteriores para detectar descuentos finalizados, ajustes, reconexiones y otros cambios registrados." },
  { question: "¿Mis datos están protegidos?", answer: "Sí. La experiencia evita mostrar DNI, número completo, cuentas financieras u otros datos sensibles. Cada consulta usa identificadores internos protegidos." },
  { question: "¿Puedo hacer preguntas sobre mi recibo?", answer: "Sí. Después del análisis puedes preguntar por cada concepto y ClarIA responderá usando únicamente la evidencia disponible para ese recibo." },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="landing-shell">
      <header className="landing-nav-wrap">
        <nav className="landing-nav" aria-label="Navegación principal">
          <Link className="landing-brand" href="/" aria-label="ClarIA, inicio"><span className="brand-mark">C</span><span>ClarIA</span></Link>
          <button className="landing-menu-button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="landing-menu" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}>{menuOpen ? <X /> : <Menu />}</button>
          <div id="landing-menu" className={`landing-menu ${menuOpen ? "is-open" : ""}`}>
            <a href="#como-funciona" onClick={closeMenu}>Cómo funciona</a><a href="#beneficios" onClick={closeMenu}>Beneficios</a><a href="#seguridad" onClick={closeMenu}>Seguridad</a><a href="#preguntas" onClick={closeMenu}>Preguntas frecuentes</a>
            <Link className="nav-cta" href="/acceso" onClick={closeMenu}>Entender mi recibo <ArrowRight size={16}/></Link>
          </div>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-glow hero-glow-one"/><div className="hero-glow hero-glow-two"/>
        <div className="landing-container hero-layout">
          <div className="landing-hero-copy">
            <span className="landing-pill"><Sparkles size={15}/> Tu recibo, explicado con evidencia</span>
            <h1>Entiende cada cambio.<br/><span>Sin dudas ni sorpresas.</span></h1>
            <p>ClarIA revisa tu recibo y sus ciclos anteriores para mostrarte, en palabras simples, qué cambió y por qué.</p>
            <div className="hero-actions"><Link className="primary-cta" href="/acceso">Entender mi recibo <ArrowRight size={18}/></Link><a className="secondary-cta" href="#como-funciona">Ver cómo funciona</a></div>
            <div className="hero-proof"><span><Check size={15}/> Causas verificadas</span><span><Check size={15}/> Sin cifras inventadas</span><span><Check size={15}/> Datos protegidos</span></div>
          </div>

          <div className="landing-product-preview" aria-label="Vista previa del análisis de un recibo">
            <div className="preview-topbar"><span className="preview-logo"><Sparkles size={15}/></span><strong>Análisis de agosto</strong><span className="preview-status"><i/> Verificado</span></div>
            <div className="preview-total"><div><small>TOTAL DEL RECIBO</small><strong>S/120<span>.00</span></strong><p><ArrowRight size={14}/> S/40.00 más que julio</p></div><span className="preview-shield"><ShieldCheck/></span></div>
            <div className="preview-reconcile"><span>Variación explicada</span><strong>100%</strong><div><i/></div></div>
            <div className="preview-causes">
              <div><span className="preview-icon blue"><Gift size={17}/></span><p>Terminó tu descuento<small>+S/20.00</small></p></div>
              <div><span className="preview-icon coral"><PlugZap size={17}/></span><p>Cargo por reconexión<small>+S/15.00</small></p></div>
              <div><span className="preview-icon mint"><ReceiptText size={17}/></span><p>Ajuste proporcional<small>+S/5.00</small></p></div>
            </div>
            <div className="preview-foot"><BadgeCheck size={15}/> Los importes coinciden con la variación total</div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Principios de ClarIA"><div className="landing-container trust-grid">
        <div><ShieldCheck/><span><strong>Explicación verificable</strong><small>Cada causa incluye su evidencia</small></span></div><div><BarChart3/><span><strong>Hasta 6 ciclos</strong><small>Identifica cambios en el tiempo</small></span></div><div><LockKeyhole/><span><strong>Privacidad primero</strong><small>Sin datos sensibles expuestos</small></span></div>
      </div></section>

      <section className="landing-section benefits-section" id="beneficios"><div className="landing-container">
        <div className="landing-section-heading centered"><span>CLARIDAD DESDE EL PRIMER MOMENTO</span><h2>Tu recibo deja de ser complicado</h2><p>No necesitas interpretar códigos ni conceptos técnicos. ClarIA organiza la información importante para ti.</p></div>
        <div className="benefit-grid"><article><span><ReceiptText/></span><h3>Todo en palabras simples</h3><p>Convierte cada cargo, descuento y ajuste en una explicación fácil de entender.</p></article><article><span><BarChart3/></span><h3>Compara tus últimos ciclos</h3><p>Te muestra cuándo apareció un cambio y cuánto impactó en el total.</p></article><article><span><FileCheck2/></span><h3>Evidencia a un clic</h3><p>Puedes revisar el registro que respalda cada causa detectada.</p></article></div>
      </div></section>

      <section className="landing-section how-section" id="como-funciona"><div className="landing-container how-layout">
        <div className="how-copy"><div className="landing-section-heading"><span>ASÍ FUNCIONA</span><h2>Tres pasos para darte una respuesta confiable</h2><p>Primero se analizan los datos. Después se comprueban las causas. Solo al final la IA prepara la explicación.</p></div><Link className="inline-link" href="/acceso">Probar con el recibo demo <ArrowRight size={17}/></Link></div>
        <div className="steps-list"><article><span className="step-number">01</span><i className="step-icon"><BarChart3/></i><div><h3>Revisamos tus recibos</h3><p>Comparamos el ciclo actual con los cinco anteriores y calculamos cada variación.</p></div></article><article><span className="step-number">02</span><i className="step-icon"><Zap/></i><div><h3>Comprobamos las causas</h3><p>Las reglas buscan descuentos, ajustes, reconexiones y eventos registrados.</p></div></article><article><span className="step-number">03</span><i className="step-icon"><Sparkles/></i><div><h3>Te lo explicamos claramente</h3><p>La IA simplifica los hechos verificados sin calcular ni modificar importes.</p></div></article></div>
      </div></section>

      <section className="landing-section evidence-section"><div className="landing-container evidence-layout">
        <div className="evidence-visual"><div className="evidence-window"><div className="evidence-window-head"><span><ShieldCheck size={18}/></span><div><small>EVIDENCIA VERIFICADA</small><strong>Terminó tu descuento</strong></div><BadgeCheck size={20}/></div><p>El descuento de bienvenida llegó a su fecha de finalización.</p><div><span>Registro fuente</span><strong>Promoción de bienvenida · Vigente hasta julio</strong></div><div><span>Impacto calculado</span><strong className="coral-text">+S/20.00</strong></div><small><LockKeyhole size={13}/> Este importe proviene del motor analítico, no de la IA.</small></div></div>
        <div className="evidence-copy"><span className="landing-pill soft"><BadgeCheck size={15}/> Transparencia real</span><h2>No tienes que confiar a ciegas</h2><p>Cada explicación incluye el registro que la respalda. Así puedes ver de dónde viene el cambio y comprobar que los importes cuadran.</p><ul><li><Check/> Causas tomadas de registros reales</li><li><Check/> Importes calculados antes de usar IA</li><li><Check/> Diferencia total reconciliada</li></ul></div>
      </div></section>

      <section className="landing-section security-section" id="seguridad"><div className="landing-container security-layout">
        <div className="security-copy"><span className="landing-pill dark"><ShieldCheck size={15}/> Seguridad desde el diseño</span><h2>Tu información se mantiene protegida</h2><p>ClarIA utiliza únicamente los datos necesarios para explicar tu recibo. No muestra DNI, números completos ni cuentas financieras.</p><div className="security-points"><span><Check/> Acceso verificado</span><span><Check/> Sin datos sensibles en pantalla</span><span><Check/> Historial protegido</span></div></div>
        <div className="channels-card"><small>DISPONIBLE DONDE LO NECESITAS</small><h3>Una explicación, en cada canal</h3><div><span><Smartphone/>Web<small>Dashboard completo</small></span><span><MessageCircleMore/>Telegram<small>Consulta rápida</small></span><span><Bot/>WhatsApp<small>Preparado para escalar</small></span></div></div>
      </div></section>

      <section className="landing-section faq-section" id="preguntas"><div className="landing-container faq-layout">
        <div className="landing-section-heading"><span>PREGUNTAS FRECUENTES</span><h2>Todo claro antes de empezar</h2><p>Si aún tienes dudas, estas son las respuestas más importantes sobre ClarIA.</p></div>
        <div className="faq-list">{faqs.map((faq, index) => <article key={faq.question} className={openFaq === index ? "open" : ""}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{faq.question}</span><ChevronDown/></button><div className="faq-answer"><p>{faq.answer}</p></div></article>)}</div>
      </div></section>

      <section className="final-cta-section"><div className="landing-container final-cta"><span><Sparkles/></span><h2>Tu recibo tiene una explicación.<br/>ClarIA te ayuda a encontrarla.</h2><p>Ingresa a la experiencia demo y descubre cómo se explica una variación completa con evidencia.</p><Link className="primary-cta light" href="/acceso">Entender mi recibo <ArrowRight size={18}/></Link></div></section>
      <footer className="landing-footer"><div className="landing-container"><Link className="landing-brand" href="/"><span className="brand-mark">C</span><span>ClarIA</span></Link><p>Explicaciones claras. Causas verificadas.</p><span>Demo · AI Telecom Challenge</span></div></footer>
    </main>
  );
}
