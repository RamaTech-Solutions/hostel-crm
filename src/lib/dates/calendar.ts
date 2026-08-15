/** Local calendar dates (YYYY-MM-DD) without UTC day-shift. */

export function calendarToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  const dt = new Date(year, month - 1, day + days);
  return calendarToday(dt);
}

export function calendarDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const slice = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : null;
}

export function inInclusiveCalendarRange(isoDate: string, start: string, end: string): boolean {
  const d = isoDate.slice(0, 10);
  return d >= start && d <= end;
}

export const UPCOMING_CHECKOUT_DAYS = 7;

export function isUpcomingPlannedCheckout(
  plannedCheckoutDate: string | null | undefined,
  today = calendarToday()
): boolean {
  const date = calendarDateOnly(plannedCheckoutDate);
  if (!date) return false;
  return inInclusiveCalendarRange(date, today, addCalendarDays(today, UPCOMING_CHECKOUT_DAYS));
}
