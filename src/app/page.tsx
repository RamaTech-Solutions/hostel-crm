import { getTenantGate } from "@/lib/auth/get-user";
import { LandingPage } from "@/features/marketing/landing-page";

export default async function Home() {
  const gate = await getTenantGate();
  return <LandingPage showDashboard={gate.status === "ready"} />;
}
