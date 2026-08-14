import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getTenantGate } from "@/lib/auth/get-user";
import { getFloors, getProperties } from "@/lib/queries";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const gate = await getTenantGate();
  if (gate.status === "anonymous") redirect("/login");
  if (gate.status === "ready") redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const meta = authUser?.user_metadata ?? {};

  const user = await getAuthUser();
  const properties = user ? await getProperties(user) : [];
  const first = properties[0];
  const floors = first ? await getFloors(first.id) : [];

  let roomCount = 0;
  if (first) {
    const { count } = await supabase
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("property_id", first.id);
    roomCount = count ?? 0;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-lg space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Awaasly</h1>
          <p className="text-sm text-muted-foreground">Run every property from one place.</p>
        </div>
        <OnboardingWizard
          needsBootstrap={gate.status === "needs_bootstrap"}
          ownerName={user?.profile.full_name || String(meta.full_name ?? "")}
          orgName={user?.organization.name || String(meta.organization_name ?? "")}
          phone={user?.profile.phone || String(meta.phone ?? "")}
          initialProperties={properties}
          initialFloors={floors}
          roomCount={roomCount}
        />
      </div>
    </div>
  );
}
