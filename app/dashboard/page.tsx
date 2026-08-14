import type { Metadata } from "next";
import { BillingDashboard } from "../components/BillingDashboard";
import { DemoSessionGuard } from "../components/DemoSessionGuard";

export const metadata: Metadata = { title: "Mi recibo | ClarIA", description: "Dashboard demostrativo de explicación verificable de facturación." };

export default function DashboardPage() { return <DemoSessionGuard><BillingDashboard /></DemoSessionGuard>; }
