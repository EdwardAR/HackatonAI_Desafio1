import type { Metadata } from "next";
import { WhatsAppDemo } from "../components/WhatsAppDemo";

export const metadata: Metadata = { title: "WhatsApp demo | ClarIA", description: "Experiencia omnicanal demostrativa de ClarIA." };

export default function WhatsAppPage() { return <WhatsAppDemo />; }
