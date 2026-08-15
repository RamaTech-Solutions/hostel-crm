import { redirect } from "next/navigation";
import { getAuthUser, canWrite } from "@/lib/auth/get-user";
import { getProperties } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { OnboardingWizard } from "@/features/residents/onboarding-wizard";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewResidentPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!canWrite(user)) redirect("/residents");

  const properties = await getProperties(user);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Residents", href: "/residents" }, { label: "Add Resident" }]} />
      <PageHeader title="Add resident" description="Three steps. Documents and photo can be added after create." />
      {properties.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add an active property before assigning a bed.</p>
      ) : (
        <OnboardingWizard properties={properties} />
      )}
    </div>
  );
}
