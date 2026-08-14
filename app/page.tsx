import type { Metadata } from "next";
import { LandingPage } from "./components/LandingPage";

export const metadata: Metadata = {
  title: "ClarIA | Entiende cada cambio de tu recibo",
  description: "Descubre por qué cambió tu recibo Movistar con explicaciones claras y causas respaldadas por evidencia.",
};

export default function Home() {
  return <LandingPage />;
}
