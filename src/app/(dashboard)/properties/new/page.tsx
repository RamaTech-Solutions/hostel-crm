import { redirect } from "next/navigation";
import { getAuthUser, canOwn } from "@/lib/auth/get-user";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PropertyForm } from "@/features/properties/property-form";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewPropertyPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!canOwn(user)) redirect("/properties");

  return (
    <div>
      <Breadcrumbs items={[{ label: "Properties", href: "/properties" }, { label: "New Property" }]} />
      <PageHeader title="Add Property" description="Required details only. You can add rooms after saving." />
      <PropertyForm />
    </div>
  );
}
