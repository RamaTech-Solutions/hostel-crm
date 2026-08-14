import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { getPayments } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import type { PaymentStatus } from "@/types/database";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; status?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const payments = await getPayments(user, { propertyId: params.property, status: params.status });

  const totalCollected = payments
    .filter((p) => p.status === "paid" || p.status === "partial")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Payments" }]} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">Total collected: {formatCurrency(totalCollected)}</p>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-left font-medium">Resident</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Property</th>
                <th className="px-4 py-3 text-left font-medium">Amount</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Method</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No payments recorded</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3">{formatDate(p.payment_date)}</td>
                    <td className="px-4 py-3">{(p.resident as { full_name: string })?.full_name}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{(p.property as { name: string })?.name}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(Number(p.amount))}</td>
                    <td className="px-4 py-3 hidden lg:table-cell capitalize">{p.payment_method.replace("_", " ")}</td>
                    <td className="px-4 py-3"><PaymentStatusBadge status={p.status as PaymentStatus} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
