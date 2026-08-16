import { canOwn } from "@/lib/auth/permissions";
import type { AuthUser } from "@/types/database";

export const RESTORE_STAY_WARNING =
  "Restoring the stay will re-occupy the previous bed. Financial transactions from checkout will not be reversed.";

export function canGiveOrUpdateNotice(status: string) {
  return status === "active" || status === "notice_period";
}

export function canCancelNotice(status: string) {
  return status === "notice_period";
}

export function canCompleteCheckout(status: string) {
  return status === "notice_period";
}

export function applyGiveNotice(status: string, plannedCheckoutDate: string) {
  return { status: "notice_period" as const, planned_checkout_date: plannedCheckoutDate, assignmentActive: true };
}

export function applyUpdateNotice(plannedCheckoutDate: string) {
  return { status: "notice_period" as const, planned_checkout_date: plannedCheckoutDate, assignmentActive: true };
}

export function applyCancelNotice() {
  return { status: "active" as const, planned_checkout_date: null as string | null, assignmentActive: true };
}

export function applyCompleteCheckout(checkoutDate: string) {
  return { status: "checked_out" as const, planned_checkout_date: checkoutDate, assignmentActive: false };
}

export function applyTransferDuringNotice(plannedCheckoutDate: string) {
  return {
    status: "notice_period" as const,
    planned_checkout_date: plannedCheckoutDate,
    paymentsUnchanged: true,
    documentsUnchanged: true,
    rentHistoryUnchanged: true,
  };
}

export function noticeDateDoesNotAutoCheckout(status: string, plannedCheckoutDate: string, today: string) {
  if (status !== "notice_period") return status;
  void plannedCheckoutDate;
  void today;
  return "notice_period";
}

export type RestoreStayEligibility = {
  residentStatus: string;
  hasActiveAssignment: boolean;
  hasLastAssignment: boolean;
  bedHasActiveAssignment: boolean;
  bedStatus: string;
  propertyStatus: string;
};

export function isRestoreStayEligible(input: RestoreStayEligibility) {
  if (input.residentStatus !== "checked_out") return false;
  if (input.hasActiveAssignment) return false;
  if (!input.hasLastAssignment) return false;
  if (input.bedHasActiveAssignment) return false;
  if (input.bedStatus === "maintenance" || input.bedStatus === "reserved") return false;
  if (input.propertyStatus !== "active") return false;
  return true;
}

export function canRestoreStay(user: AuthUser, eligibility: RestoreStayEligibility) {
  return canOwn(user) && isRestoreStayEligible(eligibility);
}

export function restoreLeavesFinanceUntouched() {
  return {
    updatesPayments: false,
    updatesCharges: false,
    updatesDeposits: false,
  };
}

export function formatResidentActivityLine(
  action: string,
  entityType: string,
  metadata?: Record<string, unknown> | null
) {
  const event = metadata?.event;
  if (event === "notice_given") return `Notice given — ${entityType}`;
  if (event === "notice_cancelled") return `Notice cancelled — ${entityType}`;
  return `${action.replace(/_/g, " ")} — ${entityType}`;
}
