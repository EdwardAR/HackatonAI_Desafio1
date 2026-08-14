import type { Metadata } from "next";
import { DemoAccess } from "../components/DemoAccess";

export const metadata: Metadata = { title: "Acceso demo | ClarIA", description: "Verifica tu acceso demostrativo para consultar la explicación de tu recibo." };

export default function AccessPage() { return <DemoAccess />; }
