import type { Metadata } from "next";
import { BillingDashboard } from "./components/BillingDashboard";

export const metadata: Metadata = {
  title: "ClarIA | Tu recibo, explicado",
  description: "Explicaciones de facturación claras, verificables y respaldadas por evidencia.",
};

export default function Home() {
  return <BillingDashboard />;
}
