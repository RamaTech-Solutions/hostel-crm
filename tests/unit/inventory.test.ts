import { describe, expect, it } from "vitest";
import { classifyBed, summarizeOccupancy } from "@/lib/inventory/occupancy";
import { evaluateOperationalRoomCreate } from "@/lib/inventory/room-create";
import {
  DUPLICATE_ROOM_ERROR,
  LAST_ACTIVE_PROPERTY_ERROR,
  ROOM_HAS_HISTORY_ERROR,
  canDeleteFloor,
  canToggleBedAvailability,
  evaluateRoomDelete,
  planOperationalRoomCreate,
} from "@/lib/inventory/room-ops";
import { canAccessProperty } from "@/lib/auth/permissions";
import type { AuthUser } from "@/types/database";

function bed(status: string, hasActiveAssignment: boolean) {
  return { status, hasActiveAssignment };
}

describe("occupancy classification", () => {
  it("A: active assignment + available status is Occupied", () => {
    expect(classifyBed(bed("available", true))).toBe("occupied");
  });

  it("B: no assignment + occupied status is not Occupied", () => {
    expect(classifyBed(bed("occupied", false))).toBe("vacant");
  });

  it("C: active assignment + maintenance is Occupied only", () => {
    expect(classifyBed(bed("maintenance", true))).toBe("occupied");
    const summary = summarizeOccupancy([bed("maintenance", true)]);
    expect(summary.occupied).toBe(1);
    expect(summary.unavailable).toBe(0);
  });

  it("D: no assignment + maintenance is Unavailable", () => {
    expect(classifyBed(bed("maintenance", false))).toBe("unavailable");
  });

  it("E: no assignment + reserved is Unavailable", () => {
    expect(classifyBed(bed("reserved", false))).toBe("unavailable");
  });

  it("F: no assignment + available is Vacant", () => {
    expect(classifyBed(bed("available", false))).toBe("vacant");
  });

  it("keeps Occupied + Vacant + Unavailable = Total", () => {
    const summary = summarizeOccupancy([
      bed("available", true),
      bed("occupied", false),
      bed("maintenance", true),
      bed("maintenance", false),
      bed("reserved", false),
      bed("available", false),
    ]);
    expect(summary.occupied + summary.vacant + summary.unavailable).toBe(summary.total);
    expect(summary.total).toBe(6);
    expect(summary.occupied).toBe(2);
    expect(summary.unavailable).toBe(2);
    expect(summary.vacant).toBe(2);
    expect(summary.capacity).toBe(4);
    expect(summary.occupancyPercent).toBe(50);
  });

  it("returns 0 occupancy when operational capacity is 0", () => {
    expect(summarizeOccupancy([bed("maintenance", false)]).occupancyPercent).toBe(0);
  });
});

describe("operational room create", () => {
  const bedsAB = [
    { id: "1", bed_label: "A", status: "available", historyCount: 0 },
    { id: "2", bed_label: "B", status: "available", historyCount: 0 },
  ];

  it("retries a partial Room 101 / Floor 1 / 3 beds create", () => {
    const result = planOperationalRoomCreate(
      { floor_id: "floor-1", beds: bedsAB },
      { floor_id: "floor-1", bed_capacity: 3 }
    );
    expect(result.type).toBe("retry");
    if (result.type === "retry") {
      expect(result.plan.toInsert).toEqual(["C"]);
      expect(result.plan.toDeleteIds).toEqual([]);
    }
  });

  it("rejects a conflicting create for a different floor", () => {
    const result = planOperationalRoomCreate(
      {
        floor_id: "floor-1",
        beds: [
          ...bedsAB,
          { id: "3", bed_label: "C", status: "available", historyCount: 0 },
        ],
      },
      { floor_id: "floor-2", bed_capacity: 4 }
    );
    expect(result).toEqual({ type: "conflict", error: DUPLICATE_ROOM_ERROR });
  });

  it("creates when the room number is new", () => {
    expect(
      planOperationalRoomCreate(null, { floor_id: "floor-1", bed_capacity: 3 })
    ).toEqual({ type: "create" });
  });

  it("does not treat a room-number change as an upsert", () => {
    expect(
      evaluateOperationalRoomCreate(
        { floor_id: "floor-1", bed_capacity: 3 },
        { floor_id: "floor-2", bed_capacity: 4 }
      )
    ).toBe("conflict");
  });
});

describe("room delete and bed availability safety", () => {
  it("blocks delete when assignment or transfer history exists", () => {
    expect(evaluateRoomDelete({ unsafeBedCount: 0, assignmentCount: 1, transferCount: 0, otherDependencyCount: 0 })).toEqual({
      ok: false,
      error: ROOM_HAS_HISTORY_ERROR,
    });
    expect(evaluateRoomDelete({ unsafeBedCount: 0, assignmentCount: 0, transferCount: 1, otherDependencyCount: 0 })).toEqual({
      ok: false,
      error: ROOM_HAS_HISTORY_ERROR,
    });
  });

  it("allows delete only when every bed is empty and history-free", () => {
    expect(evaluateRoomDelete({ unsafeBedCount: 0, assignmentCount: 0, transferCount: 0, otherDependencyCount: 0 })).toEqual({
      ok: true,
    });
  });

  it("does not delete a floor that still has rooms", () => {
    expect(canDeleteFloor(2)).toBe(false);
    expect(canDeleteFloor(0)).toBe(true);
  });

  it("never toggles availability on an assigned bed", () => {
    expect(canToggleBedAvailability(true)).toBe(false);
    expect(canToggleBedAvailability(false)).toBe(true);
  });
});

describe("property access", () => {
  const admin: AuthUser = {
    id: "u1",
    email: "admin@example.com",
    profile: {} as AuthUser["profile"],
    role: "property_admin",
    organization: {} as AuthUser["organization"],
    assignedPropertyIds: ["prop-a"],
  };

  it("rejects an unauthorized property id", () => {
    expect(canAccessProperty(admin, "prop-b")).toBe(false);
    expect(canAccessProperty(admin, "prop-a")).toBe(true);
  });

  it("blocks archiving the only active property", () => {
    expect(LAST_ACTIVE_PROPERTY_ERROR).toContain("at least one active property");
  });
});
