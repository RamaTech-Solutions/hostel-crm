export const RESIDENT_ERRORS = {
  unauthorized: "You don't have access to this property.",
  bedTaken: "This bed has just been assigned to another resident. Choose another bed.",
  alreadyAssigned: "This resident already has an active bed assignment. Use Transfer to change rooms.",
  transferFailed: "We couldn't transfer this resident. Their current assignment has not changed.",
  checkoutFailed: "We couldn't complete checkout. Please try again.",
  createFailed: "We couldn't add this resident. Please try again.",
  inactiveProperty: "This property is archived. Choose an active property.",
  bedUnavailable: "This bed is not available. Choose another bed.",
  transferDate: "Transfer date can't be before the current stay started.",
  checkoutDate: "Checkout date can't be before the current stay started.",
  noticeDate: "Notice date can't be before the current stay started.",
  noticeRequired: "Give notice before completing checkout.",
  noticeFailed: "We couldn't update notice for this resident. Please try again.",
  cancelNoticeFailed: "We couldn't cancel notice for this resident. Please try again.",
  restoreFailed: "This stay can't be restored.",
  conflictRetry: "This request doesn't match the resident already saved. Refresh and try again.",
} as const;

export function mapLifecycleError(message: string | undefined | null, fallback: string) {
  const raw = (message ?? "").toLowerCase();
  if (!raw) return fallback;
  if (raw.includes("you don't have access") || raw.includes("unauthorized")) return RESIDENT_ERRORS.unauthorized;
  if (raw.includes("just been assigned") || raw.includes("one_active_bed_assignment")) return RESIDENT_ERRORS.bedTaken;
  if (raw.includes("already has an active") || raw.includes("one_active_assignment_per_resident")) {
    return RESIDENT_ERRORS.alreadyAssigned;
  }
  if (raw.includes("archived")) return RESIDENT_ERRORS.inactiveProperty;
  if (raw.includes("no longer available") || raw.includes("current assignment has not changed")) {
    return RESIDENT_ERRORS.transferFailed;
  }
  if (raw.includes("not available") || raw.includes("maintenance") || raw.includes("reserved")) {
    return RESIDENT_ERRORS.bedUnavailable;
  }
  if (raw.includes("transfer date")) return RESIDENT_ERRORS.transferDate;
  if (raw.includes("checkout date")) return RESIDENT_ERRORS.checkoutDate;
  if (raw.includes("notice date")) return RESIDENT_ERRORS.noticeDate;
  if (raw.includes("give notice before")) return RESIDENT_ERRORS.noticeRequired;
  if (raw.includes("doesn't match") || raw.includes("does not match")) return RESIDENT_ERRORS.conflictRetry;
  return fallback;
}
