"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, MessageSquareText, RotateCcw, ShieldCheck, Smartphone } from "lucide-react";
import { createDemoSession, DEMO_OTP, hasDemoSession, isValidDemoOtp, isValidPeruvianMobile, maskPhone, normalizePhone } from "../lib/demo-session";

type Step = "phone" | "code";

export function DemoAccess() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hasDemoSession(window.sessionStorage)) router.replace("/dashboard");
  }, [router]);

  useEffect(() => {
    if (step !== "code" || countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [step, countdown]);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!isValidPeruvianMobile(phone)) { setError("Ingresa un número móvil peruano válido de 9 dígitos que empiece con 9."); return; }
    setLoading(true); await new Promise((resolve) => window.setTimeout(resolve, 500));
    setLoading(false); setStep("code"); setCountdown(30); setNotice(`Código demo enviado al número ${maskPhone(phone)}.`);
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!isValidDemoOtp(code)) { setError("El código no es correcto. Para esta demo utiliza 123456."); return; }
    setLoading(true); await new Promise((resolve) => window.setTimeout(resolve, 450));
    createDemoSession(window.sessionStorage); router.replace("/dashboard");
  };

  const resend = () => {
    if (countdown > 0) return;
    setCode(""); setError(""); setCountdown(30); setNotice(`Enviamos un nuevo código demo a ${maskPhone(phone)}.`); codeInputRef.current?.focus();
  };

  return (
    <main className="access-shell">
      <Link className="access-back" href="/"><ArrowLeft size={17}/> Volver al inicio</Link>
      <section className="access-layout">
        <div className="access-story">
          <Link className="landing-brand access-brand" href="/"><span className="brand-mark">C</span><span>ClarIA</span></Link>
          <span className="landing-pill dark"><ShieldCheck size={15}/> Acceso protegido</span>
          <h1>Tu recibo,<br/><span>solo para ti.</span></h1>
          <p>Verifica tu acceso para descubrir qué cambió en tu facturación y revisar la evidencia de cada explicación.</p>
          <ul><li><Check/> No guardamos el número ingresado</li><li><Check/> La demo no solicita DNI ni datos financieros</li><li><Check/> Puedes cerrar la sesión en cualquier momento</li></ul>
          <div className="access-demo-note"><LockKeyhole/><div><strong>Experiencia demostrativa</strong><span>Este OTP simula el acceso de un cliente para fines del hackathon.</span></div></div>
        </div>

        <div className="access-card-wrap"><div className="access-card">
          <div className="access-progress" aria-label={`Paso ${step === "phone" ? "1" : "2"} de 2`}><span className="done">1</span><i className={step === "code" ? "done" : ""}/><span className={step === "code" ? "done" : ""}>2</span></div>
          {step === "phone" ? <>
            <span className="access-icon"><Smartphone/></span><p className="access-eyebrow">PASO 1 DE 2</p><h2>Ingresa tu número móvil</h2><p className="access-description">Lo usaremos solo para simular el envío de tu código de verificación.</p>
            <form onSubmit={requestCode} noValidate><label htmlFor="demo-phone">Número móvil</label><div className={`phone-field ${error ? "has-error" : ""}`}><span>+51</span><input id="demo-phone" value={phone} onChange={(event) => { setPhone(normalizePhone(event.target.value)); setError(""); }} inputMode="numeric" autoComplete="tel-national" placeholder="900 000 000" aria-describedby="phone-help access-error" aria-invalid={Boolean(error)}/></div><small id="phone-help">Debe tener 9 dígitos y comenzar con 9.</small>{error && <p className="form-feedback error" id="access-error" role="alert">{error}</p>}<button className="access-submit" disabled={loading} type="submit">{loading ? "Enviando código…" : <>Continuar <ArrowRight size={18}/></>}</button></form>
          </> : <>
            <span className="access-icon"><MessageSquareText/></span><p className="access-eyebrow">PASO 2 DE 2</p><h2>Revisa tu código</h2><p className="access-description">Enviamos un código de 6 dígitos a <strong>{maskPhone(phone)}</strong>.</p><div className="demo-code"><span>Código para esta demo</span><strong>{DEMO_OTP}</strong></div>
            <form onSubmit={verifyCode} noValidate><label htmlFor="demo-code">Código de verificación</label><input ref={codeInputRef} className={`code-field ${error ? "has-error" : ""}`} id="demo-code" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" aria-describedby="access-notice access-error" aria-invalid={Boolean(error)} maxLength={6}/><div id="access-notice" aria-live="polite">{notice && <p className="form-feedback success">{notice}</p>}</div>{error && <p className="form-feedback error" id="access-error" role="alert">{error}</p>}<button className="access-submit" disabled={loading} type="submit">{loading ? "Verificando…" : <>Ver mi recibo <ArrowRight size={18}/></>}</button></form>
            <div className="access-actions"><button onClick={() => { setStep("phone"); setCode(""); setError(""); setNotice(""); }}><ArrowLeft size={14}/> Cambiar número</button><button onClick={resend} disabled={countdown > 0}><RotateCcw size={14}/> {countdown > 0 ? `Reenviar en ${countdown}s` : "Reenviar código"}</button></div>
          </>}
        </div><p className="access-privacy"><LockKeyhole size={13}/> El número permanece únicamente en la memoria de esta pantalla.</p></div>
      </section>
    </main>
  );
}
