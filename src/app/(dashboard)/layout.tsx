import { redirect } from "next/navigation";
import { getAuthUser, getTenantGate } from "@/lib/auth/get-user";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getNotifications } from "@/lib/queries";
import { Toaster } from "sonner";
import { DemoBanner } from "@/features/dashboard/demo-banner";

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
    <div className="min-h-screen bg-muted/30">
      <Sidebar role={user.role} orgName={user.organization.name} />
      <div className="lg:pl-64">
        {user.organization.is_demo ? <DemoBanner /> : null}
        <Header userName={user.profile.full_name} notificationCount={notifications.length} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
