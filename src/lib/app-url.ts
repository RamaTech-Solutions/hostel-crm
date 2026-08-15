const FALLBACK_APP_URL = "https://hostel-crm.vercel.app";

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || FALLBACK_APP_URL).replace(/\/$/, "");
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
