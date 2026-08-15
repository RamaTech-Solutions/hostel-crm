import { redirect, notFound } from "next/navigation";
import { getAuthUser, canAccessProperty, isOwner } from "@/lib/auth/get-user";
import { getProperty } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PropertyForm } from "@/features/properties/property-form";
import { PageHeader } from "@/components/ui/page-header";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!isOwner(user) || !canAccessProperty(user, propertyId)) redirect("/properties");

  const property = await getProperty(propertyId);
  if (!property) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Properties", href: "/properties" },
          { label: property.name, href: `/properties/${propertyId}` },
          { label: "Edit" },
        ]}
      />
      <PageHeader title="Edit property" description="Update address and contact details. Archive from the property page." />
      <PropertyForm property={property} />
    </div>
  );
}
