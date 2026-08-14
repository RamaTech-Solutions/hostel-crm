import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_PATHS = ["/login", "/signup"];
const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback", "/setup", "/demo"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
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
    if (profile?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .maybeSingle();
      ready = Boolean(org?.is_demo || org?.onboarding_completed_at || org?.slug === "urbanstay-pg");
    }

    const needsOnboarding = !ready;
    const onOnboarding = pathname === "/onboarding" || pathname.startsWith("/onboarding/");

    if (needsOnboarding && !onOnboarding && !pathname.startsWith("/auth/callback")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    if (ready && (onOnboarding || AUTH_PATHS.some((p) => pathname.startsWith(p)))) {
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
