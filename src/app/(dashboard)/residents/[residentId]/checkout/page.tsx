import { redirect, notFound } from "next/navigation";
import { getAuthUser, canWrite } from "@/lib/auth/get-user";
import { getResident } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CheckoutForm } from "@/features/residents/checkout-form";

export default async function CheckoutPage({
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
  if (resident.status === "checked_out") redirect(`/residents/${residentId}`);

  return (
    <div>
      <Breadcrumbs items={[
        { label: "Residents", href: "/residents" },
        { label: resident.full_name, href: `/residents/${residentId}` },
        { label: "Checkout" },
      ]} />
      <h1 className="text-2xl font-bold mb-6">Checkout — {resident.full_name}</h1>
      <CheckoutForm residentId={residentId} depositAmount={Number(resident.security_deposit_amount)} />
    </div>
  );
}
