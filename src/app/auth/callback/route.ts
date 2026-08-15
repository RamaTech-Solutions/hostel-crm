import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSafeNextPath } from "@/lib/app-url";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requested = searchParams.get("next");
  const next = isSafeNextPath(requested) ? requested : "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (requested === "/reset-password") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
