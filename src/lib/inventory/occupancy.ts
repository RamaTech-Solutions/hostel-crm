export type OccupancyCategory = "occupied" | "vacant" | "unavailable";
export type OccupancyDisplay = OccupancyCategory | "notice";

export type OccupancyBed = {
  status: string;
  hasActiveAssignment: boolean;
  hasNoticeOccupant?: boolean;
};

export function classifyBed(bed: OccupancyBed): OccupancyCategory {
  if (bed.hasActiveAssignment) return "occupied";
  if (bed.status === "maintenance" || bed.status === "reserved") return "unavailable";
  return "vacant";
}

export function occupancyDisplay(bed: OccupancyBed): OccupancyDisplay {
  const category = classifyBed(bed);
  if (category === "occupied" && bed.hasNoticeOccupant) return "notice";
  return category;
}

export function mapActiveAssignmentOccupancy(
  assignments: Array<{ bed_id: string; resident_id?: string | null }>,
  noticeResidentIds: Iterable<string> = []
) {
  const notice = new Set(noticeResidentIds);
  const active = new Set<string>();
  const noticeBeds = new Set<string>();
  for (const row of assignments) {
    active.add(row.bed_id);
    if (row.resident_id && notice.has(row.resident_id)) noticeBeds.add(row.bed_id);
  }
  return { active, noticeBeds };
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
