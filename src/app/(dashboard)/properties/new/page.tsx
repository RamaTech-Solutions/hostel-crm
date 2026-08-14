import { redirect } from "next/navigation";
import { getAuthUser, isOwner } from "@/lib/auth/get-user";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PropertyForm } from "@/features/properties/property-form";

export default async function NewPropertyPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!isOwner(user)) redirect("/properties");

  return (
    <div>
      <Breadcrumbs items={[{ label: "Properties", href: "/properties" }, { label: "New Property" }]} />
      <h1 className="text-2xl font-bold mb-6">Add Property</h1>
      <PropertyForm />
    </div>
  );
}
