import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { getPayments } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import type { PaymentStatus } from "@/types/database";

export default async function PaymentsReportPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const payments = await getPayments(user);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Payments" }]} />
      <div className="flex justify-between mb-6">
        <h1 className="text-[32px] font-semibold leading-10 tracking-tight">Payments</h1>
        <Button asChild variant="outline" size="sm"><Link href="/api/export/payments">Export CSV</Link></Button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Resident</th>
            <th className="px-4 py-3 text-left">Amount</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="px-4 py-3">{formatDate(p.payment_date)}</td>
                <td className="px-4 py-3">{(p.resident as { full_name: string })?.full_name}</td>
                <td className="px-4 py-3">{formatCurrency(Number(p.amount))}</td>
                <td className="px-4 py-3"><PaymentStatusBadge status={p.status as PaymentStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
