import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mapRoomsWithActiveAssignments } from "@/lib/inventory/rooms-with-beds";
import { classifyBed, summarizeOccupancy } from "@/lib/inventory/occupancy";
import { periodChargeTotals } from "@/lib/finance/ledger-summary";
import { pageRange, LIST_PAGE_SIZE } from "@/lib/list-query";

function src(relative: string) {
  return readFileSync(resolve(__dirname, relative), "utf8");
}

describe("request-scoped auth cache", () => {
  it("uses React cache and Promise.all without a process Map", () => {
    const file = src("../../src/lib/auth/get-user.ts");
    expect(file).toContain('from "react"');
    expect(file).toMatch(/cache\(async/);
    expect(file).toContain("Promise.all");
    expect(file).not.toMatch(/new Map\s*\(/);
    expect(file).not.toMatch(/globalThis/);
    expect(file).not.toContain("redis");
  });
});

describe("getRoomsWithBeds batching", () => {
  it("does not look up assignments per bed", () => {
    const file = src("../../src/lib/queries/index.ts");
    const start = file.indexOf("export async function getRoomsWithBeds");
    const next = file.indexOf("export async function getResidents", start);
    const fn = file.slice(start, next);
    expect(fn).toContain('.in("bed_id"');
    expect(fn).not.toContain("maybeSingle");
    expect(fn).not.toContain(".map(async");
  });

  it("maps active assignments by bed_id including empty rooms", () => {
    const rooms = [
      { id: "r1", beds: [] as { id: string }[] },
      { id: "r2", beds: [{ id: "b1" }, { id: "b2" }] },
    ];
    const mapped = mapRoomsWithActiveAssignments(rooms, [
      { bed_id: "b2", resident: { id: "res1", full_name: "Asha", mobile: "9876543210", status: "active" } },
    ]);
    expect(mapped[0].beds).toEqual([]);
    expect(mapped[1].beds[0].assignment).toBeNull();
    expect(mapped[1].beds[1].assignment?.resident?.full_name).toBe("Asha");
  });

  it("keeps query count constant for many beds", () => {
    const beds = Array.from({ length: 40 }, (_, i) => ({ id: `b${i}` }));
    const assignments = beds.filter((_, i) => i % 2 === 0).map((bed) => ({
      bed_id: bed.id,
      resident: { id: bed.id, full_name: "R", mobile: "9000000000", status: "active" },
    }));
    const mapped = mapRoomsWithActiveAssignments([{ id: "r", beds }], assignments);
    expect(mapped[0].beds.filter((bed) => bed.assignment)).toHaveLength(20);
    expect(mapped[0].beds).toHaveLength(40);
  });
});

describe("rooms occupancy reuse", () => {
  it("does not embed residents when loading occupancy assignments", () => {
    const file = src("../../src/lib/queries/index.ts");
    const start = file.indexOf("async function occupancyForBedIds");
    const next = file.indexOf("export async function occupancyBedsForProperties", start);
    const fn = file.slice(start, next);
    expect(fn).toContain('.select("bed_id, resident_id")');
    expect(fn).toContain('.in("bed_id"');
    expect(fn).not.toContain("resident:residents");
  });
  it("classifies from already-loaded beds plus assignment ids", () => {
    const beds = [
      { id: "1", status: "available" },
      { id: "2", status: "available" },
      { id: "3", status: "maintenance" },
    ];
    const active = new Set(["1"]);
    const occupancy = beds.map((bed) => ({
      status: bed.status,
      hasActiveAssignment: active.has(bed.id),
    }));
    expect(classifyBed(occupancy[0])).toBe("occupied");
    expect(classifyBed(occupancy[1])).toBe("vacant");
    expect(classifyBed(occupancy[2])).toBe("unavailable");
    expect(summarizeOccupancy(occupancy)).toMatchObject({ occupied: 1, vacant: 1, unavailable: 1 });
  });

  it("does not call occupancyBedsForProperties from getAllBeds", () => {
    const file = src("../../src/lib/queries/index.ts");
    const start = file.indexOf("export async function getAllBeds");
    const next = file.indexOf("export async function getPayments", start);
    const fn = file.slice(start, next);
    expect(fn).not.toContain("occupancyBedsForProperties");
    expect(fn).toContain("occupancyForBedIds");
  });
});

describe("payment summary is independent of table page", () => {
  it("totals the full period, not a sliced page", () => {
    const all = [
      { amount_due: 1000, allocated_paid: 400, outstanding: 600 },
      { amount_due: 2000, allocated_paid: 2000, outstanding: 0 },
      { amount_due: 1500, allocated_paid: 0, outstanding: 1500 },
    ];
    const { from, to } = pageRange(1, LIST_PAGE_SIZE);
    const page = all.slice(from, to + 1);
    expect(page).toHaveLength(3);
    const full = periodChargeTotals(all);
    const tinyPage = periodChargeTotals(all.slice(0, 1));
    expect(full.due).toBe(4500);
    expect(full.collected).toBe(2400);
    expect(full.outstanding).toBe(2100);
    expect(tinyPage.due).not.toBe(full.due);
    const summarySrc = src("../../src/lib/queries/index.ts");
    const start = summarySrc.indexOf("export async function getPeriodLedgerSummary");
    const fn = summarySrc.slice(start, summarySrc.indexOf("export async function getResidentCharges", start));
    expect(fn).toContain("periodChargeTotals");
    expect(fn).not.toContain("getRentCharges");
  });
});

describe("parallel loaders", () => {
  it("dashboard load uses two Promise.all waves after scope ids", () => {
    const file = src("../../src/lib/dashboard/load.ts");
    expect(file.match(/Promise\.all/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("getPropertyStats and getOnboardingSummary parallelize independent queries", () => {
    const queries = src("../../src/lib/queries/index.ts");
    const statsStart = queries.indexOf("export async function getPropertyStats");
    const stats = queries.slice(statsStart, queries.indexOf("export async function getOccupancyByProperty", statsStart));
    expect(stats).toContain("Promise.all");

    const actions = src("../../src/lib/actions/index.ts");
    const onboardStart = actions.indexOf("export async function getOnboardingSummary");
    const onboard = actions.slice(onboardStart, actions.indexOf("export async function saveOnboardingRoom", onboardStart));
    expect(onboard).toContain("Promise.all");
  });
});
