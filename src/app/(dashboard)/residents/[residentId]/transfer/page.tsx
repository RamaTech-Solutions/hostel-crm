import { redirect, notFound } from "next/navigation";
import { getAuthUser, canWrite } from "@/lib/auth/get-user";
import { getResident, getProperties } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { TransferForm } from "@/features/residents/transfer-form";

export default async function TransferPage({
  params,
}: {
  params: Promise<{ residentId: string }>;
}) {
  const { residentId } = await params;
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!canWrite(user)) redirect(`/residents/${residentId}`);

  const [resident, properties] = await Promise.all([
    getResident(residentId),
    getProperties(user),
  ]);

  if (!resident) notFound();
  if (resident.status === "checked_out") redirect(`/residents/${residentId}`);

  return (
    <div>
      <Breadcrumbs items={[
        { label: "Residents", href: "/residents" },
        { label: resident.full_name, href: `/residents/${residentId}` },
        { label: "Transfer" },
      ]} />
      <h1 className="text-2xl font-bold mb-6">Move Resident — {resident.full_name}</h1>
      <TransferForm
        residentId={residentId}
        properties={properties}
        currentPropertyId={resident.property_id ?? properties[0]?.id ?? ""}
      />
    </div>
  );
}
