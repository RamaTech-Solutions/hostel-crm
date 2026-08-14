import { redirect } from "next/navigation";
import { getAuthUser, getTenantGate } from "@/lib/auth/get-user";
import { getProperties } from "@/lib/queries";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const gate = await getTenantGate();
  if (gate.status === "anonymous") redirect("/login");
  if (gate.status === "ready") redirect("/dashboard");

  const user = await getAuthUser();
  const properties = user ? await getProperties(user) : [];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Awaasly</h1>
          <p className="text-sm text-muted-foreground">PG & hostel operations for your business</p>
        </div>
        <OnboardingWizard
          needsBootstrap={gate.status === "needs_bootstrap"}
          initialProperties={properties}
        />
      </div>
    </div>
  );
}
