export type RoomCreateIntent = {
  floor_id: string | null;
  bed_capacity: number;
};

export function evaluateOperationalRoomCreate(
  existing: { floor_id: string | null; bed_capacity: number } | null,
  requested: RoomCreateIntent
): "create" | "retry" | "conflict" {
  if (!existing) return "create";
  const sameFloor = (existing.floor_id ?? null) === (requested.floor_id ?? null);
  if (sameFloor) return "retry";
  return "conflict";
}
