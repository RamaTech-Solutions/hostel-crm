export type LedgerStatus = "due" | "partial" | "paid" | "overdue" | "voided";

export function monthStart(date: Date | string): string {
  const d = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function monthEnd(periodStart: string): string {
  const d = new Date(`${periodStart}T00:00:00`);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, "0");
  const day = String(end.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shiftMonth(periodStart: string, delta: number): string {
  const d = new Date(`${periodStart}T00:00:00`);
  d.setMonth(d.getMonth() + delta);
  return monthStart(d);
}

export function isCurrentBillingMonth(periodStart: string, today = new Date()): boolean {
  return monthStart(today) === monthStart(periodStart);
}

export function formatPeriodLabel(periodStart: string): string {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${periodStart}T00:00:00`));
}

export function rentChargeDueDate(periodStart: string, dueDay: number, joiningDate: string): string {
  const day = Math.min(28, Math.max(1, dueDay));
  const start = new Date(`${periodStart}T00:00:00`);
  const normal = new Date(start.getFullYear(), start.getMonth(), day);
  const joining = new Date(`${joiningDate}T00:00:00`);
  const firstMonth = monthStart(joiningDate) === periodStart;
  const due = firstMonth && joining > normal ? joining : normal;
  const y = due.getFullYear();
  const m = String(due.getMonth() + 1).padStart(2, "0");
  const dd = String(due.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function isEligibleForPeriod(input: {
  status: string;
  monthlyRent: number;
  joiningDate: string;
  propertyId: string | null;
  propertyStatus?: string;
  periodEnd: string;
}): boolean {
  if (input.status !== "active" && input.status !== "notice_period") return false;
  if (!(input.monthlyRent > 0)) return false;
  if (!input.propertyId) return false;
  if (input.propertyStatus && input.propertyStatus !== "active") return false;
  return input.joiningDate <= input.periodEnd;
}

export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function qualifiesAsAllocatedRent(payment: {
  payment_type: string;
  status: string;
  rent_charge_id: string | null;
}): boolean {
  return (
    payment.payment_type === "rent" &&
    (payment.status === "paid" || payment.status === "partial") &&
    Boolean(payment.rent_charge_id)
  );
}

export function deriveLedgerStatus(input: {
  amountDue: number;
  allocatedPaid: number;
  dueDate: string;
  today?: string;
  voidedAt?: string | null;
}): LedgerStatus {
  if (input.voidedAt) return "voided";
  const outstanding = roundMoney(Math.max(0, input.amountDue - input.allocatedPaid));
  if (outstanding <= 0) return "paid";
  if (input.allocatedPaid > 0) return "partial";
  const todayIso = input.today ?? new Date().toISOString().slice(0, 10);
  if (input.dueDate < todayIso) return "overdue";
  return "due";
}

export function canVoidCharge(allocatedPaid: number, voidedAt?: string | null): boolean {
  return !voidedAt && !(allocatedPaid > 0);
}

export function overpaymentBlocked(amount: number, outstanding: number): boolean {
  return roundMoney(amount) > roundMoney(outstanding);
}

export function oldestOutstandingCharge<T extends { period_start: string; outstanding: number; voided_at?: string | null }>(
  charges: T[]
): T | null {
  const open = charges
    .filter((c) => !c.voided_at && Number(c.outstanding) > 0)
    .sort((a, b) => a.period_start.localeCompare(b.period_start));
  return open[0] ?? null;
}

export function paymentReplayMatches(
  existing: {
    resident_id: string;
    property_id: string;
    amount: number;
    payment_date: string;
    payment_type: string;
    payment_method: string;
    rent_charge_id: string | null;
  },
  next: typeof existing
): boolean {
  return (
    existing.resident_id === next.resident_id &&
    existing.property_id === next.property_id &&
    roundMoney(Number(existing.amount)) === roundMoney(Number(next.amount)) &&
    existing.payment_date === next.payment_date &&
    existing.payment_type === next.payment_type &&
    existing.payment_method === next.payment_method &&
    existing.rent_charge_id === next.rent_charge_id
  );
}
