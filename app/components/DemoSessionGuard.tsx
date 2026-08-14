"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { hasDemoSession } from "../lib/demo-session";

export function DemoSessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const allowed = useSyncExternalStore(
    () => () => undefined,
    () => hasDemoSession(window.sessionStorage),
    () => false,
  );

  useEffect(() => {
    if (!allowed) router.replace("/acceso");
  }, [allowed, router]);

  if (!allowed) return <main className="session-check" role="status"><span><ShieldCheck/></span><h1>Verificando tu acceso</h1><p>Estamos preparando la explicación de tu recibo…</p></main>;
  return children;
}
