import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_PATHS = ["/login", "/signup"];
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/auth/callback",
  "/setup",
  "/demo",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)));
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
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && supabase) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .maybeSingle();

    let ready = false;
    let forceOwnerOnboarding = false;

    if (!profile?.organization_id) {
      forceOwnerOnboarding = true;
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

      const role = roleRecord?.role ?? "viewer";
      const staff = role === "property_admin" || role === "viewer";
      const complete = Boolean(org?.is_demo || org?.onboarding_completed_at || org?.slug === "urbanstay-pg");
      ready = staff || complete;
      forceOwnerOnboarding = !staff && !complete;
    }

    const onOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding/");
    const onAuthForm = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

    if (forceOwnerOnboarding && !onOnboarding && !pathname.startsWith("/auth/callback")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    if (ready && (onOnboarding || onAuthForm)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
