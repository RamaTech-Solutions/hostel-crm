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
      <Breadcrumbs items={[{ label: "Residents", href: "/residents" }, { label: "Onboard Resident" }]} />
      <PageHeader title="Add resident" description="Guided setup. You can add documents after the resident is created." />
      <OnboardingWizard properties={properties} />
    </div>
  );
}
