import { maskIdNumber } from "@/lib/utils";

/** Persist only masked identity. Never store or log the raw ID number. */
export function identityForPersistence(idNumber: string | undefined | null) {
  const raw = (idNumber ?? "").trim();
  if (!raw) {
    return { id_number_masked: null as string | null, id_last_four: null as string | null };
  }
  return {
    id_number_masked: maskIdNumber(raw),
    id_last_four: raw.slice(-4),
  };
}
