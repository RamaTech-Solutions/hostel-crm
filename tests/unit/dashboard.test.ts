import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { summarizeOccupancy } from "@/lib/inventory/occupancy";
import { isCurrentlyStaying } from "@/lib/residents/status";
import { hasOperationalContact, hasResidentIdentityDocument } from "@/lib/residents/attention";
import { addCalendarDays, calendarToday, isUpcomingPlannedCheckout } from "@/lib/dates/calendar";
import { canShowGenerateRentAction, rentReadiness } from "@/lib/dashboard/rent-readiness";
import { dashboardDestinations } from "@/lib/dashboard/links";
import { assembleDashboardOverview } from "@/lib/dashboard/overview";
import { isEligibleForPeriod } from "@/lib/finance/period";

const propA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const propB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("dashboard occupancy", () => {
  it("reuses Sprint 3 occupancy (10/6/3/1 → 67%)", () => {
    const beds = [
      ...Array.from({ length: 6 }, () => ({ status: "available", hasActiveAssignment: true })),
      ...Array.from({ length: 3 }, () => ({ status: "available", hasActiveAssignment: false })),
      { status: "maintenance", hasActiveAssignment: false },
    ];
    expect(summarizeOccupancy(beds)).toMatchObject({ occupied: 6, vacant: 3, unavailable: 1, occupancyPercent: 67 });
  });
});

describe("currently staying", () => {
  it("counts active and notice, not checked_out", () => {
    const rows = [
      ...Array.from({ length: 10 }, () => "active"),
      ...Array.from({ length: 2 }, () => "notice_period"),
      ...Array.from({ length: 4 }, () => "checked_out"),
    ];
    expect(rows.filter(isCurrentlyStaying)).toHaveLength(12);
  });
});

describe("rent readiness", () => {
  it("distinguishes no eligible, not generated, incomplete, and complete ₹0", () => {
    expect(rentReadiness({ eligibleIds: [], chargedIds: [], outstanding: 0 }).kind).toBe("no_eligible");
    expect(rentReadiness({ eligibleIds: ["1", "2"], chargedIds: [], outstanding: 0 })).toMatchObject({
      kind: "not_generated",
      missing: 2,
    });
    expect(rentReadiness({ eligibleIds: ["1", "2"], chargedIds: ["1"], outstanding: 5000 })).toMatchObject({
      kind: "incomplete",
      missing: 1,
    });
    expect(rentReadiness({ eligibleIds: ["1"], chargedIds: ["1"], outstanding: 0 })).toMatchObject({
      kind: "complete",
      outstanding: 0,
    });
    expect(rentReadiness({ eligibleIds: ["1"], chargedIds: ["1"], outstanding: 800 })).toMatchObject({
      kind: "complete",
      outstanding: 800,
    });
  });

  it("shows generate only for writers on all-properties scope with missing charges", () => {
    expect(canShowGenerateRentAction({ missing: 1, canWrite: true, allPropertiesScope: true })).toBe(true);
    expect(canShowGenerateRentAction({ missing: 1, canWrite: true, allPropertiesScope: false })).toBe(false);
    expect(canShowGenerateRentAction({ missing: 1, canWrite: false, allPropertiesScope: true })).toBe(false);
    expect(canShowGenerateRentAction({ missing: 0, canWrite: true, allPropertiesScope: true })).toBe(false);
  });
});

describe("eligibility reuse", () => {
  it("requires staying status, rent > 0, property, and joining within period", () => {
    expect(
      isEligibleForPeriod({
        status: "active",
        monthlyRent: 8000,
        joiningDate: "2026-08-01",
        propertyId: propA,
        propertyStatus: "active",
        periodEnd: "2026-08-31",
      })
    ).toBe(true);
    expect(
      isEligibleForPeriod({
        status: "checked_out",
        monthlyRent: 8000,
        joiningDate: "2026-08-01",
        propertyId: propA,
        propertyStatus: "active",
        periodEnd: "2026-08-31",
      })
    ).toBe(false);
  });
});

describe("upcoming checkout window", () => {
  it("uses calendar dates and excludes past and checked-out callers", () => {
    const today = "2026-08-15";
    expect(isUpcomingPlannedCheckout("2026-08-15", today)).toBe(true);
    expect(isUpcomingPlannedCheckout("2026-08-22", today)).toBe(true);
    expect(isUpcomingPlannedCheckout("2026-08-23", today)).toBe(false);
    expect(isUpcomingPlannedCheckout("2026-08-14", today)).toBe(false);
    expect(addCalendarDays("2026-08-15", 7)).toBe("2026-08-22");
    expect(calendarToday(new Date(2026, 7, 15))).toBe("2026-08-15");
  });
});

describe("document and contact attention", () => {
  it("ignores profile_photo for resident documents", () => {
    expect(hasResidentIdentityDocument([{ document_type: "profile_photo" }])).toBe(false);
    expect(hasResidentIdentityDocument([{ document_type: "profile_photo" }, { document_type: "aadhaar" }])).toBe(true);
  });

  it("requires usable emergency or guardian contact", () => {
    expect(hasOperationalContact([{ contact_type: "emergency", name: "A", phone: "9999999999" }])).toBe(true);
    expect(hasOperationalContact([{ contact_type: "guardian", name: "B", phone: "8888888888" }])).toBe(true);
    expect(hasOperationalContact([{ contact_type: "emergency", name: "A", phone: " " }])).toBe(false);
    expect(hasOperationalContact([])).toBe(false);
  });
});

describe("dashboard destinations", () => {
  it("preserves property scope and omits it for all", () => {
    expect(dashboardDestinations(propA, "2026-08-01").residents).toBe(`/residents?status=staying&property=${propA}`);
    expect(dashboardDestinations(propA, "2026-08-01").outstanding).toBe(`/payments?period=2026-08-01&property=${propA}`);
    expect(dashboardDestinations(propA, "2026-08-01").overdue).toBe(`/payments?status=overdue&property=${propA}`);
    expect(dashboardDestinations(propA, "2026-08-01").vacantBeds).toBe(`/rooms?propertyId=${propA}`);
    expect(dashboardDestinations(null, "2026-08-01").residents).toBe("/residents?status=staying");
    expect(dashboardDestinations(null, "2026-08-01").vacantBeds).toBe("/rooms");
    expect(dashboardDestinations(propA, "2026-08-01").noticePeriod).toBe(
      `/residents?status=notice_period&property=${propA}`
    );
    expect(dashboardDestinations(null, "2026-08-01").noticePeriod).toBe("/residents?status=notice_period");
  });
});

describe("assembleDashboardOverview scope", () => {
  it("does not mix property B into property A metrics", () => {
    const overview = assembleDashboardOverview({
      selectedPropertyId: propA,
      selectorProperties: [
        { id: propA, name: "A" },
        { id: propB, name: "B" },
      ],
      properties: [{ id: propA, name: "A" }],
      totalRooms: 1,
      occupancyBeds: [
        { id: "bed-a", property_id: propA, status: "available", hasActiveAssignment: true },
        { id: "bed-b", property_id: propB, status: "available", hasActiveAssignment: false },
      ],
      residents: [
        {
          id: "res-a",
          status: "active",
          monthly_rent: 1000,
          joining_date: "2026-01-01",
          planned_checkout_date: null,
          property_id: propA,
          full_name: "A Resident",
        },
      ],
      propertyStatusById: { [propA]: "active", [propB]: "active" },
      periodStart: "2026-08-01",
      currentCharges: [{ resident_id: "res-a", outstanding: 1000 }],
      overdue: { count: 0, amount: 0 },
      documentsByResident: { "res-a": [{ document_type: "aadhaar" }] },
      contactsByResident: { "res-a": [{ contact_type: "guardian", name: "G", phone: "9000000000" }] },
      recentReceipts: [],
      today: "2026-08-15",
    });
    expect(overview.stayingCount).toBe(1);
    expect(overview.occupancy.occupied).toBe(1);
    expect(overview.occupancy.vacant).toBe(0);
    expect(overview.totalProperties).toBe(1);
    expect(overview.rent.kind).toBe("complete");
  });

  it("counts occupied beds from assignments and notice even when checkout is more than 7 days out", () => {
    const beds = [
      { id: "101a", property_id: propA, status: "occupied", hasActiveAssignment: true },
      { id: "101b", property_id: propA, status: "occupied", hasActiveAssignment: true },
      { id: "103a", property_id: propA, status: "occupied", hasActiveAssignment: true },
      { id: "102a", property_id: propA, status: "occupied", hasActiveAssignment: true },
      { id: "102b", property_id: propA, status: "available", hasActiveAssignment: false },
      { id: "103b", property_id: propA, status: "available", hasActiveAssignment: false },
    ];
    const overview = assembleDashboardOverview({
      selectedPropertyId: propA,
      selectorProperties: [{ id: propA, name: "Subhash Colony 21" }],
      properties: [{ id: propA, name: "Subhash Colony 21" }],
      totalRooms: 3,
      occupancyBeds: beds,
      residents: [
        {
          id: "1",
          status: "active",
          monthly_rent: 2000,
          joining_date: "2026-08-15",
          planned_checkout_date: null,
          property_id: propA,
          full_name: "Amanullah Khan",
        },
        {
          id: "2",
          status: "active",
          monthly_rent: 2000,
          joining_date: "2026-08-15",
          planned_checkout_date: null,
          property_id: propA,
          full_name: "Farzana Khatoon",
        },
        {
          id: "3",
          status: "active",
          monthly_rent: 2000,
          joining_date: "2026-08-15",
          planned_checkout_date: null,
          property_id: propA,
          full_name: "Modabbera khan",
        },
        {
          id: "4",
          status: "notice_period",
          monthly_rent: 2000,
          joining_date: "2026-08-15",
          planned_checkout_date: "2026-09-16",
          property_id: propA,
          full_name: "Murshid Khan",
        },
      ],
      propertyStatusById: { [propA]: "active" },
      periodStart: "2026-08-01",
      currentCharges: [
        { resident_id: "1", outstanding: 0 },
        { resident_id: "2", outstanding: 0 },
        { resident_id: "3", outstanding: 0 },
        { resident_id: "4", outstanding: 0 },
      ],
      overdue: { count: 0, amount: 0 },
      documentsByResident: {},
      contactsByResident: {},
      recentReceipts: [],
      today: "2026-08-16",
    });
    expect(overview.stayingCount).toBe(4);
    expect(overview.occupancy).toMatchObject({ occupied: 4, vacant: 2, unavailable: 0 });
    expect(overview.noticePeriodCount).toBe(1);
    expect(overview.upcomingCheckouts).toHaveLength(0);
  });

  it("treats unauthorized property mixing as a loader concern; assemble only uses provided scope", () => {
    const overview = assembleDashboardOverview({
      selectedPropertyId: propB,
      selectorProperties: [{ id: propA, name: "A" }],
      properties: [],
      totalRooms: 0,
      occupancyBeds: [],
      residents: [],
      propertyStatusById: {},
      periodStart: "2026-08-01",
      currentCharges: [],
      overdue: { count: 0, amount: 0 },
      documentsByResident: {},
      contactsByResident: {},
      recentReceipts: [],
    });
    expect(overview.stayingCount).toBe(0);
    expect(overview.totalProperties).toBe(0);
  });
});

describe("revalidation", () => {
  it("revalidates dashboard after operational mutations", () => {
    const sql = readFileSync(resolve(__dirname, "../../src/lib/actions/index.ts"), "utf8");
    for (const fn of ["export async function updateResident", "export async function setBedAvailability", "export async function deleteRoom", "export async function uploadDocument", "export async function deleteDocument"]) {
      const start = sql.indexOf(fn);
      expect(start).toBeGreaterThan(-1);
      const slice = sql.slice(start, start + 9000);
      expect(slice).toContain('revalidatePath("/dashboard")');
    }
  });
});
