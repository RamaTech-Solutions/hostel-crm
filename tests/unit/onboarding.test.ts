import { describe, it, expect } from "vitest";
import { decideFirstPropertyAction } from "@/lib/onboarding/first-property";
import { planBedReconcile, attachAssignmentHistory } from "@/lib/onboarding/beds";
import { generateFloorRows, nextFloorNumber } from "@/lib/onboarding/floors";
import { nextOnboardingCompletedAt } from "@/lib/onboarding/completion";
import { propertySchema } from "@/lib/validations/schemas";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("first property identity", () => {
  it("creates when none exist", () => {
    expect(decideFirstPropertyAction([], null)).toEqual({ type: "create" });
  });

  it("updates the single existing property on retry", () => {
    expect(decideFirstPropertyAction([{ id: "p1" }], null)).toEqual({ type: "update", id: "p1" });
    expect(decideFirstPropertyAction([{ id: "p1" }], "p1")).toEqual({ type: "update", id: "p1" });
  });

  it("fails on ambiguous properties", () => {
    const result = decideFirstPropertyAction([{ id: "p1" }, { id: "p2" }], "p1");
    expect(result.type).toBe("fail");
  });

  it("fails if expected id does not match the only property", () => {
    const result = decideFirstPropertyAction([{ id: "p1" }], "other");
    expect(result.type).toBe("fail");
  });
});

describe("property validation", () => {
  const base = {
    address_line: "12 MG Road",
    city: "Noida",
    state: "UP",
    pincode: "201301",
    status: "active" as const,
    floor_count: 1,
  };

  it("rejects whitespace-only names", () => {
    expect(propertySchema.safeParse({ ...base, name: "   " }).success).toBe(false);
  });

  it("trims names", () => {
    const result = propertySchema.safeParse({ ...base, name: "  Sunrise PG  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Sunrise PG");
  });
});

describe("floors", () => {
  it("generates a deterministic floor set", () => {
    const rows = generateFloorRows("prop", "org", 3);
    expect(rows.map((row) => row.label)).toEqual(["Ground Floor", "Floor 1", "Floor 2"]);
  });

  it("does not change existing numbers on a second pass", () => {
    const first = generateFloorRows("prop", "org", 3).map((row) => row.floor_number);
    expect(first).toEqual([0, 1, 2]);
    expect(nextFloorNumber(first)).toBe(3);
  });
});

describe("bed history batching", () => {
  it("counts every assignment row per bed, not only the latest", () => {
    const beds = [
      { id: "b1", bed_label: "A", status: "available" },
      { id: "b2", bed_label: "B", status: "occupied" },
    ];
    const rows = [
      { bed_id: "b1" },
      { bed_id: "b1" },
      { bed_id: "b2" },
    ];
    const withHistory = attachAssignmentHistory(beds, rows);
    expect(withHistory[0].historyCount).toBe(2);
    expect(withHistory[1].historyCount).toBe(1);
  });

  it("uses zero when a bed has no assignment rows", () => {
    const withHistory = attachAssignmentHistory(
      [{ id: "b1", bed_label: "A", status: "available" }],
      []
    );
    expect(withHistory[0].historyCount).toBe(0);
    const blocked = planBedReconcile(
      attachAssignmentHistory(
        [
          { id: "1", bed_label: "A", status: "available" },
          { id: "2", bed_label: "B", status: "available" },
        ],
        [{ bed_id: "1" }, { bed_id: "1" }]
      ),
      1
    );
    expect(blocked.ok).toBe(true);
    if (blocked.ok) {
      expect(blocked.toDeleteIds).toEqual(["2"]);
      expect(blocked.toDeleteIds).not.toContain("1");
    }
  });
});

describe("bed reconcile", () => {
  it("is a no-op when already at the desired count", () => {
    const beds = [
      { id: "1", bed_label: "A", status: "available", historyCount: 0 },
      { id: "2", bed_label: "B", status: "available", historyCount: 0 },
      { id: "3", bed_label: "C", status: "available", historyCount: 0 },
    ];
    expect(planBedReconcile(beds, 3)).toEqual({ ok: true, toInsert: [], toDeleteIds: [] });
  });

  it("adds missing beds on retry from a partial 2/3 state", () => {
    const beds = [
      { id: "1", bed_label: "A", status: "available", historyCount: 0 },
      { id: "2", bed_label: "B", status: "available", historyCount: 0 },
    ];
    const plan = planBedReconcile(beds, 3);
    expect(plan.ok).toBe(true);
    if (plan.ok) expect(plan.toInsert).toEqual(["C"]);
  });

  it("never deletes a historically referenced bed", () => {
    const beds = [
      { id: "1", bed_label: "A", status: "available", historyCount: 1 },
      { id: "2", bed_label: "B", status: "available", historyCount: 0 },
      { id: "3", bed_label: "C", status: "available", historyCount: 0 },
    ];
    const keepHistory = planBedReconcile(beds, 1);
    expect(keepHistory.ok).toBe(true);
    if (keepHistory.ok) {
      expect(keepHistory.toDeleteIds).not.toContain("1");
      expect(keepHistory.toDeleteIds.sort()).toEqual(["2", "3"]);
    }

    const blocked = planBedReconcile(
      [
        { id: "1", bed_label: "A", status: "available", historyCount: 1 },
        { id: "2", bed_label: "B", status: "available", historyCount: 1 },
      ],
      1
    );
    expect(blocked.ok).toBe(false);
  });

  it("deletes only unused available beds when reducing", () => {
    const beds = [
      { id: "1", bed_label: "A", status: "available", historyCount: 0 },
      { id: "2", bed_label: "B", status: "available", historyCount: 0 },
      { id: "3", bed_label: "C", status: "available", historyCount: 0 },
    ];
    const plan = planBedReconcile(beds, 2);
    expect(plan.ok).toBe(true);
    if (plan.ok) {
      expect(plan.toDeleteIds).toHaveLength(1);
      expect(plan.toDeleteIds[0]).toBe("3");
    }
  });
});

describe("onboarding completion", () => {
  it("keeps the original completion timestamp on repeat", () => {
    expect(nextOnboardingCompletedAt("2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z")).toBe(
      "2026-01-01T00:00:00.000Z"
    );
    expect(nextOnboardingCompletedAt(null, "2026-02-01T00:00:00.000Z")).toBe("2026-02-01T00:00:00.000Z");
  });
});

describe("saveOnboardingRoom source", () => {
  it("batches assignment history and does not revalidate onboarding on the add path", () => {
    const sql = readFileSync(resolve(__dirname, "../../src/lib/actions/index.ts"), "utf8");
    const start = sql.indexOf("export async function saveOnboardingRoom");
    const end = sql.indexOf("export async function uploadDocument");
    const fn = sql.slice(start, end);
    expect(fn).toContain("applyBedReconcile");
    expect(fn).not.toContain("revalidatePath(\"/onboarding\")");
    expect(sql).toContain(".in(");
    expect(sql).toContain("attachAssignmentHistory");
  });
});
