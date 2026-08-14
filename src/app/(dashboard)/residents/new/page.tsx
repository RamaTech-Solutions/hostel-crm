import { redirect } from "next/navigation";
import { getAuthUser, canWrite } from "@/lib/auth/get-user";
import { getProperties } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { OnboardingWizard } from "@/features/residents/onboarding-wizard";

export default async function NewResidentPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!canWrite(user)) redirect("/residents");

  const properties = await getProperties(user);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Residents", href: "/residents" }, { label: "Onboard Resident" }]} />
      <h1 className="text-2xl font-bold mb-6">Onboard New Resident</h1>
      <OnboardingWizard properties={properties} />
    </div>
  );
}
