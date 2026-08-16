const LETTER_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function bedLabelAt(index: number) {
  return LETTER_LABELS[index] ?? String(index + 1);
}

export function nextBedLabels(existingLabels: string[], addCount: number) {
  const used = new Set(existingLabels);
  const labels: string[] = [];
  let i = 0;
  while (labels.length < addCount && i < 100) {
    const label = bedLabelAt(i);
    if (!used.has(label)) {
      labels.push(label);
      used.add(label);
    }
    i += 1;
  }
  return labels;
}

export type BedReconcileInput = {
  id: string;
  bed_label: string;
  status: string;
  historyCount: number;
};

export type BedReconcilePlan =
  | { ok: true; toInsert: string[]; toDeleteIds: string[] }
  | { ok: false; error: string };

/** Counts every assignment row per bed (historical + active), matching PostgREST count:exact. */
export function historyCountsByBedId(rows: { bed_id: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.bed_id, (counts.get(row.bed_id) ?? 0) + 1);
  }
  return counts;
}

export function attachAssignmentHistory<T extends { id: string }>(
  beds: T[],
  assignmentRows: { bed_id: string }[]
): Array<T & { historyCount: number }> {
  const counts = historyCountsByBedId(assignmentRows);
  return beds.map((bed) => ({ ...bed, historyCount: counts.get(bed.id) ?? 0 }));
}

export function planBedReconcile(beds: BedReconcileInput[], desired: number): BedReconcilePlan {
  if (!Number.isInteger(desired) || desired < 1 || desired > 20) {
    return { ok: false, error: "Enter a bed count between 1 and 20." };
  }

  if (beds.length === desired) {
    return { ok: true, toInsert: [], toDeleteIds: [] };
  }

  if (beds.length < desired) {
    return {
      ok: true,
      toInsert: nextBedLabels(
        beds.map((bed) => bed.bed_label),
        desired - beds.length
      ),
      toDeleteIds: [],
    };
  }

  const removable = beds.filter((bed) => bed.status === "available" && bed.historyCount === 0);
  const needRemove = beds.length - desired;
  if (removable.length < needRemove) {
    return {
      ok: false,
      error: "We couldn't reduce the bed count because some beds already have assignment history.",
    };
  }

  const ranked = [...removable].sort((a, b) => b.bed_label.localeCompare(a.bed_label));
  return {
    ok: true,
    toInsert: [],
    toDeleteIds: ranked.slice(0, needRemove).map((bed) => bed.id),
  };
}
