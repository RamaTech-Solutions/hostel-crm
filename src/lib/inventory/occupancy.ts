export type OccupancyCategory = "occupied" | "vacant" | "unavailable";

export type OccupancyBed = {
  status: string;
  hasActiveAssignment: boolean;
};

export function classifyBed(bed: OccupancyBed): OccupancyCategory {
  if (bed.hasActiveAssignment) return "occupied";
  if (bed.status === "maintenance" || bed.status === "reserved") return "unavailable";
  return "vacant";
}

export function summarizeOccupancy(beds: OccupancyBed[]) {
  let occupied = 0;
  let vacant = 0;
  let unavailable = 0;
  for (const bed of beds) {
    const category = classifyBed(bed);
    if (category === "occupied") occupied += 1;
    else if (category === "unavailable") unavailable += 1;
    else vacant += 1;
  }
  const total = beds.length;
  const capacity = total - unavailable;
  return {
    total,
    occupied,
    vacant,
    unavailable,
    capacity,
    occupancyPercent: capacity > 0 ? Math.round((occupied / capacity) * 100) : 0,
  };
}
