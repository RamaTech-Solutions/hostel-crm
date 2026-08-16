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

  if (resident.status === "checked_out") {
    return (
      <div>
        <Breadcrumbs items={[
          { label: "Residents", href: "/residents" },
          { label: resident.full_name, href: `/residents/${residentId}` },
          { label: "Checkout" },
        ]} />
        <p className="text-sm text-muted-foreground">This resident is already checked out. History and payments are preserved.</p>
      </div>
    );
  }

  if (resident.status !== "notice_period") {
    redirect(`/residents/${residentId}/notice`);
  }

  return (
    <div>
      <Breadcrumbs items={[
        { label: "Residents", href: "/residents" },
        { label: resident.full_name, href: `/residents/${residentId}` },
        { label: "Checkout" },
      ]} />
      <h1 className="mb-6 text-[32px] font-semibold leading-10 tracking-tight">Checkout — {resident.full_name}</h1>
      <CheckoutForm
        residentId={residentId}
        depositAmount={Number(resident.security_deposit_amount)}
        plannedCheckoutDate={resident.planned_checkout_date}
      />
    </div>
  );
}
