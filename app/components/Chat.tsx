"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, Headphones, ReceiptText, RefreshCw, Send, ShieldCheck, Sparkles } from "lucide-react";

export type ChatResponse = {
  conversation_id: string;
  text: string;
  answer: string;
  breakdown: { concept: string; amount: string; previous_amount: string; date: string; evidence: { table: string; field: string; value: string }[] }[];
  actions: ("pagar" | "ver_detalle" | "derivar_asesor" | "cross_sell")[];
  cross_sell_offer?: { title: string; description: string; price: string; source_offer_code: string } | null;
  handoff?: { reason: string; context: Record<string, string> } | null;
  closing_reminder?: string | null;
  tone: "neutral" | "confundido" | "molesto";
  generated_by: string;
};

type Message = { role: "user" | "assistant"; text: string; response?: ChatResponse };
type Props = { customerKey: string; displayName: string; channel?: "web" | "whatsapp"; variant?: "app" | "whatsapp"; autoStart?: boolean };

const actionLabels = { pagar: "Cómo pagar", ver_detalle: "Ver detalle", derivar_asesor: "Hablar con un asesor", cross_sell: "Ver oferta" };
const actionMessages = { pagar: "¿Cómo pago mi recibo?", ver_detalle: "Explícame la variación del recibo actual", derivar_asesor: "Quiero hablar con un asesor", cross_sell: "Quiero conocer la oferta disponible" };

function AssistantExtras({ response, onAction }: { response: ChatResponse; onAction: (message: string) => void }) {
  return <>
    {response.breakdown?.length > 0 && <div className="chat-breakdown" aria-label="Desglose verificado">
      <div className="rich-title"><ReceiptText size={15} /> Causas verificadas</div>
      {response.breakdown.map((item, index) => <div className="breakdown-item" key={`${item.concept}-${index}`}><div className="breakdown-row">
        <span><strong>{item.concept}</strong><small>Registro · {item.date}</small></span>
        <b>{Number(item.amount) >= 0 ? "+" : "−"}S/{Math.abs(Number(item.amount)).toFixed(2)}</b>
      </div>{item.evidence.length > 0 && <details><summary>Ver fuente del cálculo</summary><div>{item.evidence.map((evidence, evidenceIndex) => <p key={`${evidence.table}-${evidence.field}-${evidenceIndex}`}><span>{evidence.table} · {evidence.field}</span><strong>{evidence.value}</strong></p>)}</div></details>}</div>)}
      <small className="source-note"><ShieldCheck size={12} /> Importes calculados fuera de la IA</small>
    </div>}
    {response.cross_sell_offer && <div className="offer-card">
      <span><Sparkles size={15} /> Oferta habilitada por regla</span>
      <strong>{response.cross_sell_offer.title} · S/{Number(response.cross_sell_offer.price).toFixed(2)}</strong>
      <p>{response.cross_sell_offer.description}</p>
    </div>}
    {response.handoff && <div className="handoff-card">
      <div className="rich-title"><Headphones size={15} /> Resumen enviado al asesor</div>
      <p>{response.handoff.reason}</p>
      <dl>{Object.entries(response.handoff.context).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{value}</dd></div>)}</dl>
    </div>}
    {response.closing_reminder && <div className="closing-reminder"><CheckCircle2 size={16} /><span>{response.closing_reminder}</span></div>}
    <div className="response-meta"><ShieldCheck size={12}/> Respuesta: {response.generated_by.replaceAll("-", " ")}</div>
    {response.actions?.length > 0 && <div className="chat-actions"><span>Siguiente paso recomendado</span>
      {response.actions.map((action) => <button key={action} type="button" onClick={() => onAction(actionMessages[action])}>{actionLabels[action]} <ArrowRight size={13} /></button>)}
    </div>}
  </>;
}

export function Chat({ customerKey, displayName, channel = "web", variant = "app", autoStart = false }: Props) {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: `Hola, ${displayName}. Soy ClarIA y revisaré solo información verificada de tu recibo.` }]);
  const [question, setQuestion] = useState("");
  const [thinking, setThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [error, setError] = useState("");
  const [lastAttempt, setLastAttempt] = useState("");
  const started = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ask = async (raw?: string, appendUser = true) => {
    const text = (raw ?? question).trim();
    if (!text || thinking) return;
    if (appendUser) setMessages((current) => [...current, { role: "user", text }]);
    setQuestion("");
    setThinking(true);
    setError("");
    setLastAttempt(text);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_key: customerKey, message: text, conversation_id: conversationId, channel }),
      });
      if (!response.ok) throw new Error("No pudimos consultar el motor en este momento.");
      const data = await response.json() as ChatResponse;
      setConversationId(data.conversation_id);
      setMessages((current) => [...current, { role: "assistant", text: data.text ?? data.answer, response: data }]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Ocurrió un error inesperado.";
      setError(`${message} Verifica que FastAPI esté encendido y vuelve a intentar.`);
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    if (autoStart && customerKey && started.current !== customerKey && messages.length) {
      started.current = customerKey;
      void ask("Explícame la variación del recibo actual");
    }
  // ask se ejecuta una vez por cambio de cliente mediante started.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, customerKey, messages.length]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    messagesEndRef.current?.scrollIntoView({ block: "end", behavior: reducedMotion ? "auto" : "smooth" });
  }, [messages, thinking, error]);

  const submit = (event: FormEvent) => { event.preventDefault(); void ask(); };

  return <section className={`shared-chat chat-${variant}`} aria-label="Conversación con ClarIA">
    <header className="chat-title"><span><Bot size={19} /></span><div><strong>ClarIA</strong><small><i /> En línea · Evidencia y cifras verificadas</small></div><em><ShieldCheck size={13}/> Motor seguro</em></header>
    <div className="messages" aria-live="polite" aria-busy={thinking}>
      {messages.map((message, index) => <div className={`message-group ${message.role}`} key={`${index}-${message.text.slice(0, 12)}`}>
        <div className={`message ${message.role}`}>{message.text}</div>
        {message.response && <AssistantExtras response={message.response} onAction={(value) => void ask(value)} />}
      </div>)}
      {thinking && <div className="message assistant typing" aria-label="ClarIA está escribiendo"><i/><i/><i/></div>}
      {error && <div className="chat-error" role="alert"><span>{error}</span><button type="button" onClick={() => void ask(lastAttempt, false)}><RefreshCw size={13}/> Reintentar</button></div>}
      <div ref={messagesEndRef}/>
    </div>
    <form className="composer" onSubmit={submit}>
      <label className="sr-only" htmlFor={`chat-question-${variant}`}>Pregunta sobre tu recibo</label>
      <input id={`chat-question-${variant}`} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pregunta sobre tu recibo…" maxLength={1000} />
      <button className="send" type="submit" aria-label="Enviar" disabled={thinking || !question.trim()}><Send size={17}/></button>
    </form>
  </section>;
}
