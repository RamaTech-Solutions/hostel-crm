export const FINANCE_ERRORS = {
  unauthorized: "You don't have access to this property.",
  generateUnauthorized: "You don't have access to generate rent.",
  recordUnauthorized: "You don't have access to record payments.",
  currentMonthOnly: "Rent can only be generated for the current month.",
  overpay: "This amount is more than the outstanding for this period. Enter the outstanding amount or record a separate payment.",
  conflictRetry: "This request doesn't match the payment already saved. Refresh and try again.",
  voidOwner: "Only the owner can cancel an unpaid rent charge.",
  voidWithPayments: "A charge with payments cannot be cancelled.",
  voidedCharge: "This rent charge was cancelled and cannot accept payments.",
  dueDayOwner: "Only the owner can change the rent due day.",
  dueDayRange: "Rent due day must be between 1 and 28.",
  generateFailed: "We couldn't generate rent. Please try again.",
  recordFailed: "We couldn't record this payment. Please try again.",
} as const;

export function mapFinanceError(message: string | undefined | null, fallback: string) {
  const raw = (message ?? "").toLowerCase();
  if (!raw) return fallback;
  if (raw.includes("only be generated for the current month")) return FINANCE_ERRORS.currentMonthOnly;
  if (raw.includes("more than the outstanding")) return message ?? FINANCE_ERRORS.overpay;
  if (raw.includes("doesn't match") || raw.includes("does not match")) return FINANCE_ERRORS.conflictRetry;
  if (raw.includes("only the owner can cancel")) return FINANCE_ERRORS.voidOwner;
  if (raw.includes("cannot be cancelled")) return FINANCE_ERRORS.voidWithPayments;
  if (raw.includes("cancelled and cannot accept")) return FINANCE_ERRORS.voidedCharge;
  if (raw.includes("rent due day")) return FINANCE_ERRORS.dueDayRange;
  if (raw.includes("only the owner can change")) return FINANCE_ERRORS.dueDayOwner;
  if (raw.includes("don't have access") || raw.includes("unauthorized")) return FINANCE_ERRORS.unauthorized;
  return fallback;
}
