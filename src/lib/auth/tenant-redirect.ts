export type TenantKind = "anonymous" | "demo" | "incomplete" | "ready";

export type OrgDemoFields = {
  is_demo?: boolean | null;
  slug?: string | null;
  onboarding_completed_at?: string | null;
};

export function isDemoOrganization(org: OrgDemoFields | null | undefined): boolean {
  if (!org) return false;
  return Boolean(org.is_demo || org.slug === "urbanstay-pg");
}

export function tenantKindFromMembership(input: {
  hasProfile: boolean;
  role: string | null | undefined;
  org: OrgDemoFields | null | undefined;
}): TenantKind {
  if (!input.hasProfile) return "incomplete";
  const role = input.role ?? "viewer";
  if (role === "property_admin" || role === "viewer") return "ready";
  if (isDemoOrganization(input.org)) return "demo";
  if (input.org?.onboarding_completed_at) return "ready";
  return "incomplete";
}

function pathOnly(pathname: string) {
  return pathname.split("?")[0] || pathname;
}

export function destinationAfterSignUp(session: { user?: { id: string } } | null | undefined) {
  return session?.user?.id ? "/onboarding" : "/signup/check-email";
}

export function shouldClearSessionBeforeSignUp(kind: TenantKind) {
  return kind === "demo";
}

/** Where middleware should send this tenant, or null to leave the request as-is. */
export function tenantRedirect(pathname: string, kind: TenantKind): string | null {
  const path = pathOnly(pathname);

  if (kind === "anonymous") return null;

  const onReset = path === "/reset-password" || path.startsWith("/reset-password/");
  const onCallback = path === "/auth/callback" || path.startsWith("/auth/callback/");
  if (onReset || onCallback) return null;

  if (path === "/signup/check-email") return null;

  const onOnboarding = path === "/onboarding" || path.startsWith("/onboarding/");
  const onSignupExact = path === "/signup";
  const onLogin = path === "/login";
  const onForgot = path === "/forgot-password" || path.startsWith("/forgot-password/");

  if (kind === "incomplete") {
    if (onOnboarding) return null;
    return "/onboarding";
  }

  if (kind === "demo") {
    if (onOnboarding) return "/dashboard";
    if (onSignupExact || onLogin || onForgot) return null;
    return null;
  }

  if (onOnboarding || onSignupExact || onLogin || onForgot) return "/dashboard";
  return null;
}
