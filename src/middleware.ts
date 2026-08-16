import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { tenantKindFromMembership, tenantRedirect } from "@/lib/auth/tenant-redirect";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/setup",
  "/demo",
  "/robots.txt",
  "/sitemap.xml",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)));
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.includes("-auth-token"));
}

export async function middleware(request: NextRequest) {
  const { response, user, configured, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!configured && pathname !== "/setup") {
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  if (configured && pathname === "/setup") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!user && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    if (hasSupabaseAuthCookie(request)) {
      loginUrl.searchParams.set("error", "session");
    }
    return NextResponse.redirect(loginUrl);
  }

  if (user && supabase) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    let kind: ReturnType<typeof tenantKindFromMembership> = "incomplete";

    if (!profile?.organization_id) {
      kind = "incomplete";
    } else {
      const [{ data: org }, { data: roleRecord }] = await Promise.all([
        supabase
          .from("organizations")
          .select("is_demo, onboarding_completed_at, slug")
          .eq("id", profile.organization_id)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      kind = tenantKindFromMembership({
        hasProfile: true,
        role: roleRecord?.role,
        org,
      });
    }

    const next = tenantRedirect(pathname, kind);
    if (next) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
