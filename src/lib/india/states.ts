export const INDIA_STATES_AND_UTS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type IndianStateOrUT = (typeof INDIA_STATES_AND_UTS)[number];

export const STATE_REQUIRED_MESSAGE = "Select a valid Indian state or UT";

export function isIndianState(value: string): value is IndianStateOrUT {
  return (INDIA_STATES_AND_UTS as readonly string[]).includes(value);
}

/** Official list plus the stored legacy value on edit only. Does not mutate INDIA_STATES_AND_UTS. */
export function stateSelectOptions(current?: string | null): string[] {
  const official = [...INDIA_STATES_AND_UTS];
  const stored = current?.trim() ?? "";
  if (stored && !isIndianState(stored)) {
    return [stored, ...official];
  }
  return official;
}

export function matchesStoredValue(submitted: string, stored: string | null | undefined): boolean {
  if (stored === undefined || stored === null) return false;
  return submitted.trim() === stored.trim();
}

export function resolveStateForWrite(
  submitted: string,
  stored: string | null | undefined,
  required: boolean
): { ok: true; value: string } | { ok: false; error: string } {
  const submittedTrim = submitted.trim();
  if (stored != null && matchesStoredValue(submitted, stored)) {
    if (required && !stored.trim()) {
      return { ok: false, error: STATE_REQUIRED_MESSAGE };
    }
    return { ok: true, value: stored };
  }
  if (!submittedTrim) {
    if (required) return { ok: false, error: "State is required" };
    return { ok: true, value: "" };
  }
  if (isIndianState(submittedTrim)) return { ok: true, value: submittedTrim };
  return { ok: false, error: STATE_REQUIRED_MESSAGE };
}
