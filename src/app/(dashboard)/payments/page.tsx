import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth/get-user";
import { getPayments, getPeriodLedgerSummary, getProperties, getRentCharges } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/ui/status-badge";
import type { PaymentStatus } from "@/types/database";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableHead, DataTh, DataTableBody, DataTr, DataTd } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { StatCard, StatCardCurrency } from "@/components/ui/stat-card";
import { GenerateRentButton } from "@/features/payments/generate-rent-button";
import { LedgerStatusBadge } from "@/features/payments/ledger-status-badge";
import { VoidChargeButton } from "@/features/payments/void-charge-button";
import { formatPeriodLabel, isCurrentBillingMonth, monthStart, shiftMonth } from "@/lib/finance/period";
import { IndianRupee, Wallet, AlertCircle, CalendarDays } from "lucide-react";
import { ListPagination } from "@/components/ui/list-pagination";
import { LIST_PAGE_SIZE, parsePage } from "@/lib/list-query";
import { canWrite, canOwn } from "@/lib/auth/permissions";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; status?: string; period?: string; q?: string; page?: string; rpage?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const periodStart = monthStart(params.period || new Date().toISOString().slice(0, 10));
  const prev = shiftMonth(periodStart, -1);
  const next = shiftMonth(periodStart, 1);
  const chargePage = parsePage(params.page);
  const receiptPage = parsePage(params.rpage);
  const [paymentResult, allCharges, summary, properties] = await Promise.all([
    getPayments(user, { propertyId: params.property, page: receiptPage, pageSize: LIST_PAGE_SIZE }),
    getRentCharges(user, {
      periodStart,
      propertyId: params.property,
      status: params.status,
      search: params.q,
    }),
    getPeriodLedgerSummary(user, periodStart, params.property),
    getProperties(user),
  ]);
  const payments = paymentResult.rows;
  const chargeFrom = (chargePage - 1) * LIST_PAGE_SIZE;
  const charges = allCharges.slice(chargeFrom, chargeFrom + LIST_PAGE_SIZE);

  const query = new URLSearchParams();
  if (params.property) query.set("property", params.property);
  if (params.status) query.set("status", params.status);
  if (params.q) query.set("q", params.q);
  const withPeriod = (p: string) => {
    const nextQuery = new URLSearchParams(query);
    nextQuery.set("period", p);
    return `/payments?${nextQuery.toString()}`;
  };
  const chargesHref = (p: number) => {
    const nextQuery = new URLSearchParams(query);
    nextQuery.set("period", periodStart);
    if (params.rpage) nextQuery.set("rpage", params.rpage);
    if (p > 1) nextQuery.set("page", String(p));
    return `/payments?${nextQuery.toString()}`;
  };
  const receiptsHref = (p: number) => {
    const nextQuery = new URLSearchParams(query);
    nextQuery.set("period", periodStart);
    if (params.page) nextQuery.set("page", params.page);
    if (p > 1) nextQuery.set("rpage", String(p));
    return `/payments?${nextQuery.toString()}`;
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Payments" }]} />
      <PageHeader
        title="Rent & Payments"
        description={`${formatPeriodLabel(periodStart)} · collected is allocated to this month’s charges, even if money arrived later.`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm"><Link href={withPeriod(prev)}>Previous</Link></Button>
          <span className="text-sm font-medium">{formatPeriodLabel(periodStart)}</span>
          <Button asChild variant="outline" size="sm"><Link href={withPeriod(next)}>Next</Link></Button>
        </div>
        {canWrite(user) ? <GenerateRentButton periodStart={periodStart} /> : null}
      </div>

      {summary.legacyReceiptCount > 0 && isCurrentBillingMonth(periodStart) ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          Legacy receipts exist for this period. They are preserved but are not allocated to the new rent ledger.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.ledgerGenerated ? (
          <>
            <StatCardCurrency title="Due" value={summary.due} icon={IndianRupee} />
            <StatCardCurrency title="Collected" value={summary.collected} icon={Wallet} tone="success" />
            <StatCardCurrency title="Outstanding" value={summary.outstanding} icon={AlertCircle} tone={summary.outstanding > 0 ? "danger" : "default"} />
          </>
        ) : (
          <>
            <StatCard title="Due" value="Rent not generated" icon={CalendarDays} />
            <StatCard title="Collected" value="Rent not generated" icon={Wallet} />
            <StatCard title="Outstanding" value="Rent not generated" icon={AlertCircle} />
          </>
        )}
        <StatCardCurrency title="Overdue" value={summary.overdue} icon={AlertCircle} tone={summary.overdue > 0 ? "danger" : "default"} subtitle="Open overdue charges in your properties" />
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" method="get">
        <input type="hidden" name="period" value={periodStart} />
        <select name="property" defaultValue={params.property ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">All statuses</option>
          <option value="due">Due</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <input name="q" defaultValue={params.q ?? ""} placeholder="Resident name" className="h-10 rounded-md border bg-background px-3 text-sm" />
        <Button type="submit" variant="outline">Filter</Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Who owes</h2>
        {!summary.ledgerGenerated ? (
          <EmptyState
            title="No rent charges yet"
            description="Generate this month’s rent to start tracking collections. Existing receipts stay in payment history and are not auto-allocated."
            action={canWrite(user) && isCurrentBillingMonth(periodStart) ? <GenerateRentButton periodStart={periodStart} /> : undefined}
          />
        ) : allCharges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No charges match these filters.</p>
        ) : (
          <>
            <div className="hidden md:block">
              <DataTable>
                <DataTableHead>
                  <DataTh>Resident</DataTh>
                  <DataTh>Property</DataTh>
                  <DataTh>Due</DataTh>
                  <DataTh>Paid</DataTh>
                  <DataTh>Outstanding</DataTh>
                  <DataTh>Status</DataTh>
                  {canOwn(user) ? <DataTh className="w-[1%]"> </DataTh> : null}
                </DataTableHead>
                <DataTableBody>
                  {charges.map((c) => (
                    <DataTr key={c.id}>
                      <DataTd>
                        <Link href={`/residents/${c.resident_id}`} className="font-medium hover:underline">
                          {(c.resident as { full_name?: string } | undefined)?.full_name ?? "Resident"}
                        </Link>
                      </DataTd>
                      <DataTd>{(c.property as { name?: string } | undefined)?.name}</DataTd>
                      <DataTd>{formatCurrency(Number(c.amount_due))}</DataTd>
                      <DataTd>{formatCurrency(Number(c.allocated_paid))}</DataTd>
                      <DataTd className="font-medium">{formatCurrency(Number(c.outstanding))}</DataTd>
                      <DataTd><LedgerStatusBadge status={c.ledger_status} /></DataTd>
                      {canOwn(user) ? (
                        <DataTd>
                          <VoidChargeButton
                            chargeId={c.id}
                            residentId={c.resident_id}
                            allocatedPaid={Number(c.allocated_paid)}
                            outstanding={Number(c.outstanding)}
                            voidedAt={c.voided_at}
                          />
                        </DataTd>
                      ) : null}
                    </DataTr>
                  ))}
                </DataTableBody>
              </DataTable>
            </div>
            <div className="space-y-3 md:hidden">
              {charges.map((c) => (
                <div key={c.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/residents/${c.resident_id}`} className="font-medium hover:underline">
                      {(c.resident as { full_name?: string } | undefined)?.full_name}
                    </Link>
                    <LedgerStatusBadge status={c.ledger_status} />
                  </div>
                  <p className="mt-2 text-sm">Outstanding {formatCurrency(Number(c.outstanding))}</p>
                  <p className="text-xs text-muted-foreground">Due {formatCurrency(Number(c.amount_due))} · Paid {formatCurrency(Number(c.allocated_paid))}</p>
                  {canOwn(user) ? (
                    <div className="mt-3">
                      <VoidChargeButton
                        chargeId={c.id}
                        residentId={c.resident_id}
                        allocatedPaid={Number(c.allocated_paid)}
                        outstanding={Number(c.outstanding)}
                        voidedAt={c.voided_at}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <ListPagination page={chargePage} pageSize={LIST_PAGE_SIZE} total={allCharges.length} hrefFor={chargesHref} />
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Received</h2>
        <p className="text-xs text-muted-foreground">Transaction list by payment date. August collected above uses allocations to August charges.</p>
        {paymentResult.total === 0 ? (
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
                      <DataTd>
                        <div className="flex flex-wrap items-center gap-2">
                          <PaymentStatusBadge status={p.status as PaymentStatus} />
                          {!p.rent_charge_id ? <span className="text-xs text-muted-foreground">Unallocated (legacy)</span> : null}
                        </div>
                      </DataTd>
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
                  {!p.rent_charge_id ? <p className="text-xs text-muted-foreground">Unallocated (legacy)</p> : null}
                </div>
              ))}
            </div>
            <ListPagination page={receiptPage} pageSize={LIST_PAGE_SIZE} total={paymentResult.total} hrefFor={receiptsHref} />
          </>
        )}
      </section>
    </div>
  );
}
