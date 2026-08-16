import { describe, expect, it } from "vitest";
import { residentCreateDetailsSchema, residentStaySchema } from "@/lib/residents/validation";
import { identityForPersistence } from "@/lib/residents/identity";
import { validateCheckoutDate, validateNoticeDate, validateTransferDate } from "@/lib/residents/dates";
import { isBedAssignable, nextBedStatusAfterAssignmentEnd } from "@/lib/residents/eligibility";
import { mapLifecycleError, RESIDENT_ERRORS } from "@/lib/residents/errors";
import { classifyBed, summarizeOccupancy } from "@/lib/inventory/occupancy";
import { canAccessProperty } from "@/lib/auth/permissions";
import { maskIdNumber } from "@/lib/utils";
import type { AuthUser } from "@/types/database";

describe("resident create validation", () => {
  it("requires name and mobile only on details", () => {
    expect(residentCreateDetailsSchema.safeParse({ full_name: "Rahul Sharma", mobile: "9876543210" }).success).toBe(true);
    expect(residentCreateDetailsSchema.safeParse({ full_name: "R", mobile: "9876543210" }).success).toBe(false);
  });

  it("allows create without email DOB address emergency documents", () => {
    const result = residentCreateDetailsSchema.safeParse({
      full_name: "Anita",
      mobile: "9123456789",
    });
    expect(result.success).toBe(true);
  });

  it("requires stay assignment fields", () => {
    const id = crypto.randomUUID();
    expect(
      residentStaySchema.safeParse({
        property_id: id,
        room_id: crypto.randomUUID(),
        bed_id: crypto.randomUUID(),
        joining_date: "2026-08-15",
        monthly_rent: 8500,
      }).success
    ).toBe(true);
  });
});

describe("identity masking", () => {
  it("never persists the raw id number", () => {
    const persisted = identityForPersistence("1234-5678-9012");
    expect(persisted.id_number_masked).toBe(maskIdNumber("1234-5678-9012"));
    expect(persisted.id_number_masked).not.toContain("5678");
    expect(persisted.id_last_four).toBe("9012");
  });
});

describe("dates", () => {
  it("rejects transfer before assignment start", () => {
    expect(validateTransferDate("2026-08-10", "2026-08-09")).toBe(RESIDENT_ERRORS.transferDate);
    expect(validateTransferDate("2026-08-10", "2026-08-10")).toBeNull();
  });

  it("rejects checkout before assignment start", () => {
    expect(validateCheckoutDate("2026-08-10", "2026-08-01")).toBe(RESIDENT_ERRORS.checkoutDate);
  });

  it("rejects notice before assignment start", () => {
    expect(validateNoticeDate("2026-08-10", "2026-08-01")).toBe(RESIDENT_ERRORS.noticeDate);
    expect(validateNoticeDate("2026-08-10", "2026-08-10")).toBeNull();
  });
});

describe("bed eligibility and inventory status", () => {
  it("rejects inactive property and unavailable beds", () => {
    expect(isBedAssignable({ hasActiveAssignment: false, status: "available", propertyStatus: "inactive" })).toBe(false);
    expect(isBedAssignable({ hasActiveAssignment: true, status: "available", propertyStatus: "active" })).toBe(false);
    expect(isBedAssignable({ hasActiveAssignment: false, status: "maintenance", propertyStatus: "active" })).toBe(false);
    expect(isBedAssignable({ hasActiveAssignment: false, status: "reserved", propertyStatus: "active" })).toBe(false);
    expect(isBedAssignable({ hasActiveAssignment: false, status: "available", propertyStatus: "active" })).toBe(true);
  });

  it("preserves maintenance and reserved after assignment end", () => {
    expect(nextBedStatusAfterAssignmentEnd("occupied")).toBe("available");
    expect(nextBedStatusAfterAssignmentEnd("maintenance")).toBe("maintenance");
    expect(nextBedStatusAfterAssignmentEnd("reserved")).toBe("reserved");
  });
});

describe("occupancy still uses assignments", () => {
  it("keeps the Sprint 3 invariant", () => {
    const summary = summarizeOccupancy([
      { status: "available", hasActiveAssignment: true },
      { status: "occupied", hasActiveAssignment: false },
      { status: "maintenance", hasActiveAssignment: false },
    ]);
    expect(classifyBed({ status: "available", hasActiveAssignment: true })).toBe("occupied");
    expect(summary.occupied + summary.vacant + summary.unavailable).toBe(summary.total);
  });
});

describe("permissions and friendly errors", () => {
  const admin: AuthUser = {
    id: "u1",
    email: "a@x.com",
    profile: {} as AuthUser["profile"],
    role: "property_admin",
    organization: {} as AuthUser["organization"],
    assignedPropertyIds: ["prop-a"],
  };

  it("rejects unauthorized property ids", () => {
    expect(canAccessProperty(admin, "prop-b")).toBe(false);
  });

  it("maps duplicate-bed errors", () => {
    expect(mapLifecycleError("one_active_bed_assignment", RESIDENT_ERRORS.createFailed)).toBe(RESIDENT_ERRORS.bedTaken);
  });
});
