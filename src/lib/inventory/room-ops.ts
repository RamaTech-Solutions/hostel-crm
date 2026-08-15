import { planBedReconcile, type BedReconcileInput } from "@/lib/onboarding/beds";
import { evaluateOperationalRoomCreate } from "@/lib/inventory/room-create";

export const DUPLICATE_ROOM_ERROR =
  "A room with this number already exists. Edit the existing room instead.";

export const ROOM_HAS_HISTORY_ERROR = "This room has resident history and can't be deleted.";

export const LAST_ACTIVE_PROPERTY_ERROR =
  "You need at least one active property. Keep this one active, or reactivate another property first.";

export function planOperationalRoomCreate(
  existing: { floor_id: string | null; beds: BedReconcileInput[] } | null,
  requested: { floor_id: string | null; bed_capacity: number }
):
  | { type: "create" }
  | { type: "retry"; plan: Extract<ReturnType<typeof planBedReconcile>, { ok: true }> }
  | { type: "conflict"; error: string }
  | { type: "fail"; error: string } {
  const decision = evaluateOperationalRoomCreate(
    existing ? { floor_id: existing.floor_id, bed_capacity: existing.beds.length } : null,
    requested
  );
  if (decision === "conflict") {
    return { type: "conflict", error: DUPLICATE_ROOM_ERROR };
  }
  if (decision === "create") {
    return { type: "create" };
  }
  const plan = planBedReconcile(existing?.beds ?? [], requested.bed_capacity);
  if (!plan.ok) return { type: "fail", error: plan.error };
  return { type: "retry", plan };
}

export function evaluateRoomDelete(input: {
  unsafeBedCount: number;
  assignmentCount: number;
  transferCount: number;
  otherDependencyCount: number;
}): { ok: true } | { ok: false; error: string } {
  if (
    input.unsafeBedCount > 0 ||
    input.assignmentCount > 0 ||
    input.transferCount > 0 ||
    input.otherDependencyCount > 0
  ) {
    return { ok: false, error: ROOM_HAS_HISTORY_ERROR };
  }
  return { ok: true };
}

export function canDeleteFloor(roomCount: number) {
  return roomCount === 0;
}

export function canToggleBedAvailability(hasActiveAssignment: boolean) {
  return !hasActiveAssignment;
}
