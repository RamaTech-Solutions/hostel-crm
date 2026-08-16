import { matchesStoredValue } from "@/lib/india/states";

export const INDIAN_MOBILE_ERROR = "Enter a valid 10-digit mobile number";

export type NormalizeMobileResult =
  | { kind: "empty"; value: "" }
  | { kind: "ok"; value: string }
  | { kind: "invalid"; error: string };

/**
 * UI formatting only is stripped. "91" is removed only when the remaining digits
 * are exactly 12 characters and start with "91". Does not strip the first two
 * digits of an arbitrary 12-digit number.
 */
export function normalizeIndianMobile(raw: unknown): NormalizeMobileResult {
  if (raw == null) return { kind: "empty", value: "" };
  let value = String(raw).trim();
  if (value === "") return { kind: "empty", value: "" };

  value = value.replace(/[\s-]/g, "");
  if (value.startsWith("+91")) {
    value = value.slice(3);
  }

  if (!/^\d+$/.test(value)) {
    return { kind: "invalid", error: INDIAN_MOBILE_ERROR };
  }

  if (value.length === 12 && value.startsWith("91")) {
    value = value.slice(2);
  }

  if (value.length !== 10) {
    return { kind: "invalid", error: INDIAN_MOBILE_ERROR };
  }

  return { kind: "ok", value };
}

export function displayIndianMobileDigits(stored: string | null | undefined): string {
  const normalized = normalizeIndianMobile(stored);
  if (normalized.kind === "ok") return normalized.value;
  return String(stored ?? "")
    .trim()
    .replace(/[\s-]/g, "")
    .replace(/^\+91/, "");
}

export function resolveMobileForWrite(
  submitted: string,
  stored: string | null | undefined,
  required: boolean
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (stored != null && matchesStoredValue(submitted, stored)) {
    const kept = stored.trim();
    if (required && !kept) return { ok: false, error: INDIAN_MOBILE_ERROR };
    return { ok: true, value: kept || null };
  }

  const submittedNormalized = normalizeIndianMobile(submitted);
  const storedNormalized = stored == null ? { kind: "empty" as const } : normalizeIndianMobile(stored);
  if (
    stored != null &&
    submittedNormalized.kind === "ok" &&
    storedNormalized.kind === "ok" &&
    submittedNormalized.value === storedNormalized.value
  ) {
    return { ok: true, value: stored.trim() || submittedNormalized.value };
  }

  const normalized = submittedNormalized;
  if (normalized.kind === "empty") {
    if (required) return { ok: false, error: INDIAN_MOBILE_ERROR };
    return { ok: true, value: null };
  }
  if (normalized.kind === "ok") return { ok: true, value: normalized.value };
  return { ok: false, error: normalized.error };
}
