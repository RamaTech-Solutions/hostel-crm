import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyBed } from "@/lib/inventory/occupancy";
import { isBedAssignable } from "@/lib/residents/eligibility";
import { mapLifecycleError, RESIDENT_ERRORS } from "@/lib/residents/errors";
import { canOwn } from "@/lib/auth/permissions";
import {
  applyCancelNotice,
  applyCompleteCheckout,
  applyGiveNotice,
  applyTransferDuringNotice,
  applyUpdateNotice,
  canCancelNotice,
  canCompleteCheckout,
  canGiveOrUpdateNotice,
  canRestoreStay,
  formatResidentActivityLine,
  isRestoreStayEligible,
  noticeDateDoesNotAutoCheckout,
  restoreLeavesFinanceUntouched,
} from "@/lib/residents/notice-lifecycle";
import type { AuthUser } from "@/types/database";

function user(role: AuthUser["role"]): AuthUser {
  return {
    id: "u1",
    email: "t@example.com",
    role,
    assignedPropertyIds: [],
    organization: {
      id: "o1",
      name: "Org",
      slug: "org",
      logo_url: null,
      settings: {},
      is_active: true,
      is_demo: false,
      onboarding_completed_at: "2026-01-01",
      rent_due_day: 5,
      created_at: "",
      updated_at: "",
    },
    profile: {
      id: "u1",
      organization_id: "o1",
      full_name: "Test",
      email: "t@example.com",
      phone: null,
      avatar_url: null,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
  } as AuthUser;
}

function functionSql(file: string, name: string) {
  const sql = readFileSync(resolve(__dirname, "../../supabase/migrations", file), "utf8");
  const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = sql.indexOf("CREATE OR REPLACE FUNCTION public.", start + 1);
  const revoke = sql.indexOf("REVOKE ALL ON FUNCTION public.", start + 1);
  const end = [next, revoke].filter((i) => i > start).sort((a, b) => a - b)[0] ?? sql.length;
  return sql.slice(start, end);
}

const noticeSql = "20260816120000_notice_period_lifecycle.sql";
const lifecycleSql = "20260815160000_resident_lifecycle.sql";

const eligibleRestore = {
  residentStatus: "checked_out",
  hasActiveAssignment: false,
  hasLastAssignment: true,
  bedHasActiveAssignment: false,
  bedStatus: "available",
  propertyStatus: "active",
};

describe("notice lifecycle state machine", () => {
  it("moves active to notice without vacating", () => {
    expect(canGiveOrUpdateNotice("active")).toBe(true);
    expect(applyGiveNotice("active", "2026-09-16")).toEqual({
      status: "notice_period",
      planned_checkout_date: "2026-09-16",
      assignmentActive: true,
    });
  });

  it("updates notice date while assignment stays active", () => {
    expect(applyUpdateNotice("2026-10-01")).toEqual({
      status: "notice_period",
      planned_checkout_date: "2026-10-01",
      assignmentActive: true,
    });
  });

  it("cancels notice back to active", () => {
    expect(canCancelNotice("notice_period")).toBe(true);
    expect(applyCancelNotice()).toEqual({
      status: "active",
      planned_checkout_date: null,
      assignmentActive: true,
    });
  });

  it("completes checkout only from notice", () => {
    expect(canCompleteCheckout("active")).toBe(false);
    expect(canCompleteCheckout("notice_period")).toBe(true);
    expect(applyCompleteCheckout("2026-09-16").status).toBe("checked_out");
    expect(applyCompleteCheckout("2026-09-16").assignmentActive).toBe(false);
  });

  it("does not auto-checkout when notice date is today or past", () => {
    expect(noticeDateDoesNotAutoCheckout("notice_period", "2026-08-16", "2026-08-16")).toBe("notice_period");
    expect(noticeDateDoesNotAutoCheckout("notice_period", "2026-08-01", "2026-08-16")).toBe("notice_period");
  });

  it("keeps notice and date across transfer", () => {
    expect(applyTransferDuringNotice("2026-09-16")).toEqual({
      status: "notice_period",
      planned_checkout_date: "2026-09-16",
      paymentsUnchanged: true,
      documentsUnchanged: true,
      rentHistoryUnchanged: true,
    });
  });

  it("keeps a notice bed unassignable", () => {
    expect(classifyBed({ status: "occupied", hasActiveAssignment: true })).toBe("occupied");
    expect(isBedAssignable({ hasActiveAssignment: true, status: "occupied", propertyStatus: "active" })).toBe(false);
  });
});

describe("restore stay guards", () => {
  it("allows an owner to restore an eligible checkout", () => {
    expect(canRestoreStay(user("owner"), eligibleRestore)).toBe(true);
  });

  it("rejects non-owners", () => {
    expect(canOwn(user("property_admin"))).toBe(false);
    expect(canRestoreStay(user("property_admin"), eligibleRestore)).toBe(false);
    expect(canRestoreStay(user("viewer"), eligibleRestore)).toBe(false);
  });

  it("rejects reserved, maintenance, inactive property, and occupied beds", () => {
    expect(isRestoreStayEligible({ ...eligibleRestore, bedStatus: "reserved" })).toBe(false);
    expect(isRestoreStayEligible({ ...eligibleRestore, bedStatus: "maintenance" })).toBe(false);
    expect(isRestoreStayEligible({ ...eligibleRestore, propertyStatus: "inactive" })).toBe(false);
    expect(isRestoreStayEligible({ ...eligibleRestore, bedHasActiveAssignment: true })).toBe(false);
  });

  it("leaves financial records untouched", () => {
    expect(restoreLeavesFinanceUntouched()).toEqual({
      updatesPayments: false,
      updatesCharges: false,
      updatesDeposits: false,
    });
  });
});

describe("activity copy", () => {
  it("formats notice events", () => {
    expect(formatResidentActivityLine("updated", "resident", { event: "notice_given" })).toBe("Notice given — resident");
    expect(formatResidentActivityLine("updated", "resident", { event: "notice_cancelled" })).toBe(
      "Notice cancelled — resident"
    );
  });
});

describe("notice-period SQL is authoritative", () => {
  it("give notice checks write access, assignment, and date", () => {
    const sql = functionSql(noticeSql, "give_resident_notice");
    expect(sql).toContain("can_user_write()");
    expect(sql).toContain("can_access_resident");
    expect(sql).toContain("is_active = true AND a.end_date IS NULL");
    expect(sql).toContain("p_planned_checkout_date < v_current.start_date");
    expect(sql).not.toContain("release_bed_inventory_status");
    expect(sql).not.toContain("UPDATE public.payments");
  });

  it("cancel notice only clears status and planned date", () => {
    const sql = functionSql(noticeSql, "cancel_resident_notice");
    expect(sql).toContain("can_user_write()");
    expect(sql).toContain("status = 'active'");
    expect(sql).toContain("planned_checkout_date = NULL");
    expect(sql).not.toContain("release_bed_inventory_status");
    expect(sql).not.toContain("UPDATE public.bed_assignments");
  });

  it("checkout from active is rejected in SQL", () => {
    const sql = functionSql(noticeSql, "checkout_resident");
    expect(sql).toContain("Give notice before completing checkout");
    expect(sql).toContain("notice_period");
  });

  it("maps direct checkout rejection", () => {
    expect(mapLifecycleError("Give notice before completing checkout.", RESIDENT_ERRORS.checkoutFailed)).toBe(
      RESIDENT_ERRORS.noticeRequired
    );
  });

  it("restore is owner-only and does not touch finance", () => {
    const sql = functionSql(noticeSql, "restore_resident_stay");
    const file = readFileSync(resolve(__dirname, "../../supabase/migrations", noticeSql), "utf8");
    expect(sql).toContain("can_user_own()");
    expect(sql).toContain("maintenance");
    expect(sql).toContain("reserved");
    expect(sql).not.toContain("UPDATE public.payments");
    expect(sql).not.toContain("UPDATE public.rent_charges");
    expect(sql).not.toContain("UPDATE public.security_deposits");
    expect(file).toContain("REVOKE ALL ON FUNCTION public.restore_resident_stay(uuid) FROM PUBLIC, anon");
    expect(file).toContain("GRANT EXECUTE ON FUNCTION public.restore_resident_stay(uuid) TO authenticated");
  });

  it("transfer does not reset resident status", () => {
    const sql = functionSql(lifecycleSql, "transfer_resident");
    expect(sql).not.toMatch(/UPDATE public\.residents[\s\S]*status\s*=/);
    expect(sql).not.toContain("planned_checkout_date");
  });
});
