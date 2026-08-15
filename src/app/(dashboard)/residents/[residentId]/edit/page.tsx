import { redirect, notFound } from "next/navigation";
import { getAuthUser, canWrite } from "@/lib/auth/get-user";
import { getResident } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageHeader } from "@/components/ui/page-header";
import { ResidentEditForm } from "@/features/residents/resident-edit-form";

export default async function EditResidentPage({
  params,
}: {
  params: Promise<{ residentId: string }>;
}) {
  const { residentId } = await params;
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!canWrite(user)) redirect(`/residents/${residentId}`);

  const resident = await getResident(residentId);
  if (!resident) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Residents", href: "/residents" },
          { label: resident.full_name, href: `/residents/${residentId}` },
          { label: "Edit" },
        ]}
      />
      <PageHeader title="Edit resident" description="Update profile and agreed terms. Use Transfer to change rooms." />
      <ResidentEditForm resident={resident} contacts={resident.contacts ?? []} />
    </div>
  );
}
