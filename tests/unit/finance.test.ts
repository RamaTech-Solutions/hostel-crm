import { describe, expect, it } from "vitest";
import {
  canVoidCharge,
  deriveLedgerStatus,
  isEligibleForPeriod,
  isCurrentBillingMonth,
  monthEnd,
  monthStart,
  oldestOutstandingCharge,
  overpaymentBlocked,
  paymentReplayMatches,
  qualifiesAsAllocatedRent,
  rentChargeDueDate,
  roundMoney,
  shiftMonth,
} from "@/lib/finance/period";
import { mapFinanceError, FINANCE_ERRORS } from "@/lib/finance/errors";
import { summarizeOccupancy, classifyBed } from "@/lib/inventory/occupancy";

describe("billing period", () => {
  it("normalizes August 2026", () => {
    expect(monthStart("2026-08-20")).toBe("2026-08-01");
    expect(monthEnd("2026-08-01")).toBe("2026-08-31");
    expect(shiftMonth("2026-08-01", 1)).toBe("2026-09-01");
  });

  it("identifies current month only for generation", () => {
    expect(isCurrentBillingMonth(monthStart(new Date()))).toBe(true);
    expect(isCurrentBillingMonth("2020-01-01")).toBe(false);
  });
});

describe("due date", () => {
  it("uses org due day for later months", () => {
    expect(rentChargeDueDate("2026-09-01", 5, "2026-08-20")).toBe("2026-09-05");
  });

  it("first month is max(due day, joining)", () => {
    expect(rentChargeDueDate("2026-08-01", 5, "2026-08-20")).toBe("2026-08-20");
    expect(rentChargeDueDate("2026-08-01", 5, "2026-08-02")).toBe("2026-08-05");
  });
});

describe("generation eligibility", () => {
  const base = {
    status: "active",
    monthlyRent: 8500,
    joiningDate: "2026-08-20",
    propertyId: "p1",
    propertyStatus: "active",
    periodEnd: "2026-08-31",
  };

  it("includes active and notice_period", () => {
    expect(isEligibleForPeriod(base)).toBe(true);
    expect(isEligibleForPeriod({ ...base, status: "notice_period" })).toBe(true);
  });

  it("skips checkout, zero rent, late joiners, inactive property", () => {
    expect(isEligibleForPeriod({ ...base, status: "checked_out" })).toBe(false);
    expect(isEligibleForPeriod({ ...base, monthlyRent: 0 })).toBe(false);
    expect(isEligibleForPeriod({ ...base, joiningDate: "2026-09-01" })).toBe(false);
    expect(isEligibleForPeriod({ ...base, propertyStatus: "inactive" })).toBe(false);
    expect(isEligibleForPeriod({ ...base, status: "blacklisted" })).toBe(false);
  });
});

describe("allocated paid qualification", () => {
  it("counts only received rent linked to a charge", () => {
    expect(qualifiesAsAllocatedRent({ payment_type: "rent", status: "paid", rent_charge_id: "c1" })).toBe(true);
    expect(qualifiesAsAllocatedRent({ payment_type: "rent", status: "partial", rent_charge_id: "c1" })).toBe(true);
    expect(qualifiesAsAllocatedRent({ payment_type: "rent", status: "pending", rent_charge_id: "c1" })).toBe(false);
    expect(qualifiesAsAllocatedRent({ payment_type: "deposit", status: "paid", rent_charge_id: "c1" })).toBe(false);
    expect(qualifiesAsAllocatedRent({ payment_type: "rent", status: "paid", rent_charge_id: null })).toBe(false);
  });
});

describe("ledger status", () => {
  it("partial then paid", () => {
    expect(deriveLedgerStatus({ amountDue: 8500, allocatedPaid: 3000, dueDate: "2026-08-05", today: "2026-08-01" })).toBe("partial");
    expect(deriveLedgerStatus({ amountDue: 8500, allocatedPaid: 8500, dueDate: "2026-08-05", today: "2026-08-10" })).toBe("paid");
  });

  it("overdue only when outstanding", () => {
    expect(deriveLedgerStatus({ amountDue: 8500, allocatedPaid: 0, dueDate: "2026-07-05", today: "2026-08-15" })).toBe("overdue");
    expect(deriveLedgerStatus({ amountDue: 8500, allocatedPaid: 8500, dueDate: "2026-07-05", today: "2026-08-15" })).toBe("paid");
    expect(deriveLedgerStatus({ amountDue: 8500, allocatedPaid: 0, dueDate: "2026-08-20", today: "2026-08-15" })).toBe("due");
  });
});

describe("payments", () => {
  it("blocks overpayment and does not split", () => {
    expect(overpaymentBlocked(11500, 8500)).toBe(true);
    expect(overpaymentBlocked(8500, 8500)).toBe(false);
  });

  it("defaults to oldest outstanding", () => {
    const oldest = oldestOutstandingCharge([
      { period_start: "2026-08-01", outstanding: 8500 },
      { period_start: "2026-07-01", outstanding: 3000 },
    ]);
    expect(oldest?.period_start).toBe("2026-07-01");
  });

  it("replay matches same uuid payload", () => {
    const row = {
      resident_id: "r1",
      property_id: "p1",
      amount: 3000,
      payment_date: "2026-08-15",
      payment_type: "rent",
      payment_method: "upi",
      rent_charge_id: "c1",
    };
    expect(paymentReplayMatches(row, row)).toBe(true);
    expect(paymentReplayMatches(row, { ...row, amount: 5000 })).toBe(false);
  });

  it("cannot void a charge with payments", () => {
    expect(canVoidCharge(0)).toBe(true);
    expect(canVoidCharge(0, null)).toBe(true);
    expect(canVoidCharge(3000)).toBe(false);
    expect(canVoidCharge(0, "2026-08-15T00:00:00Z")).toBe(false);
  });

  it("rounds money to paise", () => {
    expect(roundMoney(8499.999)).toBe(8500);
  });
});

describe("friendly errors", () => {
  it("maps overpay and current-month generate", () => {
    expect(mapFinanceError("Rent can only be generated for the current month.", "x")).toBe(FINANCE_ERRORS.currentMonthOnly);
    expect(mapFinanceError("This amount is more than the outstanding for this period. Enter ₹3000.", "x")).toContain("outstanding");
  });
});

describe("occupancy regression A–F", () => {
  it("still classifies beds from assignments", () => {
    expect(classifyBed({ status: "available", hasActiveAssignment: true })).toBe("occupied");
    expect(classifyBed({ status: "occupied", hasActiveAssignment: false })).toBe("vacant");
    const summary = summarizeOccupancy([
      { status: "available", hasActiveAssignment: true },
      { status: "occupied", hasActiveAssignment: false },
      { status: "maintenance", hasActiveAssignment: true },
      { status: "maintenance", hasActiveAssignment: false },
      { status: "reserved", hasActiveAssignment: false },
      { status: "available", hasActiveAssignment: false },
    ]);
    expect(summary.occupied + summary.vacant + summary.unavailable).toBe(6);
  });
});
