export function nextOnboardingCompletedAt(existing: string | null, nowIso: string) {
  return existing ?? nowIso;
}
