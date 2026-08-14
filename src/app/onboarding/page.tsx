import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getTenantGate } from "@/lib/auth/get-user";
import { getFloors, getProperties } from "@/lib/queries";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { AwaaslyLogo } from "@/components/brand/awaasly-logo";

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
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <AwaaslyLogo showTagline />
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
