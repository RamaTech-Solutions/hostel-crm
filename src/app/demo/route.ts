import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
/** Best-effort in-memory limit for this server instance only. Not shared across Vercel instances. */
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function demoUnavailable(request: NextRequest) {
  return NextResponse.redirect(new URL("/login?error=demo", request.url), 303);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url), 303);
    }

    if (isRateLimited(clientKey(request))) {
      console.error("Demo login rate limited");
      return demoUnavailable(request);
    }

    const email =
      process.env.DEMO_OWNER_EMAIL?.trim() || "owner@demo-hostel.com";
    const password = process.env.DEMO_OWNER_PASSWORD;

    if (!password) {
      console.error("Demo login is not configured");
      return demoUnavailable(request);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Demo login failed");
      return demoUnavailable(request);
    }

    return NextResponse.redirect(new URL("/dashboard", request.url), 303);
  } catch {
    console.error("Demo login unavailable");
    return demoUnavailable(request);
  }
}
