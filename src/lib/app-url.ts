function stripOrigin(raw: string | undefined | null): string {
  return (raw ?? "").trim().replace(/\/$/, "");
}

/** Canonical origin for this deployment. Never falls back to the production hostname. */
export function getAppUrl() {
  const configured = stripOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configured) return configured;
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function getDemoHref(): string {
  const configured = stripOrigin(process.env.NEXT_PUBLIC_DEMO_URL);
  return configured || "/demo";
}

export function getPrimaryAppUrl(): string | null {
  const configured = stripOrigin(process.env.NEXT_PUBLIC_PRIMARY_APP_URL);
  return configured || null;
}

export function getPublicSignupHref(): string {
  const primary = getPrimaryAppUrl();
  if (!primary) return "/signup";
  return `${primary}/signup`;
}

export function isSafeNextPath(next: string | null | undefined): next is string {
  if (!next) return false;
  if (!next.startsWith("/") || next.startsWith("//")) return false;
  if (next.includes("\\") || next.includes("://")) return false;
  return true;
}

export function authCallbackUrl(nextPath: string, origin?: string) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : getAppUrl());
  const next = isSafeNextPath(nextPath) ? nextPath : "/onboarding";
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
