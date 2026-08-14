import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { getPayments } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import type { PaymentStatus } from "@/types/database";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DataTable, DataTableHead, DataTh, DataTableBody, DataTr, DataTd } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

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
      <PageHeader
        title="Rent & Payments"
        description={`Collected ${formatCurrency(totalCollected)}`}
      />

      {payments.length === 0 ? (
        <EmptyState
          title="No payments recorded"
          description="Record a payment from a resident profile when rent is collected."
          action={<Button asChild variant="outline"><Link href="/residents">Go to Residents</Link></Button>}
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable>
              <DataTableHead>
                <DataTh>Date</DataTh>
                <DataTh>Resident</DataTh>
                <DataTh className="hidden lg:table-cell">Property</DataTh>
                <DataTh>Amount</DataTh>
                <DataTh className="hidden lg:table-cell">Method</DataTh>
                <DataTh>Status</DataTh>
              </DataTableHead>
              <DataTableBody>
                {payments.map((p) => (
                  <DataTr key={p.id} className={cn(p.status === "overdue" && "bg-destructive/5")}>
                    <DataTd>{formatDate(p.payment_date)}</DataTd>
                    <DataTd>{(p.resident as { full_name: string })?.full_name}</DataTd>
                    <DataTd className="hidden lg:table-cell">{(p.property as { name: string })?.name}</DataTd>
                    <DataTd className="font-medium">{formatCurrency(Number(p.amount))}</DataTd>
                    <DataTd className="hidden lg:table-cell capitalize">{p.payment_method.replace("_", " ")}</DataTd>
                    <DataTd><PaymentStatusBadge status={p.status as PaymentStatus} /></DataTd>
                  </DataTr>
                ))}
              </DataTableBody>
            </DataTable>
          </div>
          <div className="space-y-3 md:hidden">
            {payments.map((p) => (
              <div key={p.id} className={cn("rounded-lg border bg-card p-4", p.status === "overdue" && "border-destructive/40")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{(p.resident as { full_name: string })?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.payment_date)}</p>
                  </div>
                  <PaymentStatusBadge status={p.status as PaymentStatus} />
                </div>
                <p className="mt-2 text-sm font-medium">{formatCurrency(Number(p.amount))}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
