import { redirect } from "next/navigation";
import { getAuthUser, getTenantGate } from "@/lib/auth/get-user";
import { getNotifications } from "@/lib/queries";
import { Toaster } from "sonner";
import { DemoBanner } from "@/features/dashboard/demo-banner";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await getTenantGate();
  if (gate.status === "anonymous") redirect("/login");
  if (gate.status !== "ready") redirect("/onboarding");

  const user = await getAuthUser();
  if (!user) redirect("/onboarding");

  const notifications = await getNotifications(user);

  return (
    <>
      <AppShell
        role={user.role}
        orgName={user.organization.name}
        userName={user.profile.full_name}
        notificationCount={notifications.length}
        banner={user.organization.is_demo ? <DemoBanner /> : null}
      >
        {children}
      </AppShell>
      <Toaster position="top-right" richColors />
    </>
  );
}
