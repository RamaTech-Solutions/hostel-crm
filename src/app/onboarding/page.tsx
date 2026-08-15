import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, getTenantGate } from "@/lib/auth/get-user";
import { getFloors, getProperties, getRoomsWithBeds } from "@/lib/queries";
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
  const onboardingProperty = properties.length === 1 ? properties[0] : null;
  const floors = onboardingProperty ? await getFloors(onboardingProperty.id) : [];
  const rooms = onboardingProperty ? await getRoomsWithBeds(onboardingProperty.id) : [];

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <AwaaslyLogo variant="stacked" placement="auth" />
        </div>
        <OnboardingWizard
          needsBootstrap={gate.status === "needs_bootstrap"}
          ownerName={user?.profile.full_name || String(meta.full_name ?? "")}
          orgName={user?.organization.name || String(meta.organization_name ?? "")}
          phone={user?.profile.phone || String(meta.phone ?? "")}
          initialProperties={onboardingProperty ? [onboardingProperty] : []}
          initialFloors={floors}
          initialRooms={rooms.map((room) => ({
            id: room.id,
            room_number: room.room_number,
            bed_capacity: room.bed_capacity,
            floor_id: room.floor_id,
            beds: room.beds?.map((bed) => ({ id: bed.id })) ?? [],
          }))}
        />
      </div>
    </div>
  );
}
