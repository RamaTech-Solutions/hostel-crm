export type RoomBedAssignmentResident = {
  id: string;
  full_name: string;
  mobile: string;
  status: string;
};

export type ActiveBedAssignmentRow = {
  bed_id: string;
  resident?: RoomBedAssignmentResident | RoomBedAssignmentResident[] | null;
};

export function mapRoomsWithActiveAssignments<
  TBed extends { id: string },
  TRoom extends { beds?: TBed[] | null },
>(
  rooms: TRoom[],
  assignments: ActiveBedAssignmentRow[]
): Array<Omit<TRoom, "beds"> & { beds: Array<TBed & { assignment: { resident: RoomBedAssignmentResident | undefined } | null }> }> {
  const byBed = new Map<string, { resident: RoomBedAssignmentResident | undefined }>();
  for (const row of assignments) {
    const resident = Array.isArray(row.resident) ? row.resident[0] : row.resident;
    byBed.set(row.bed_id, { resident: resident ?? undefined });
  }
  return rooms.map((room) => ({
    ...room,
    beds: (room.beds ?? []).map((bed) => ({
      ...bed,
      assignment: byBed.get(bed.id) ?? null,
    })),
  }));
}
