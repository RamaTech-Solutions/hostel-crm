"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toUserError } from "@/lib/user-error";
import { isSafeNextPath, getDemoHref } from "@/lib/app-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/features/auth/password-field";
import { ResendConfirmation } from "@/features/auth/resend-confirmation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const demoUnavailable = searchParams.get("error") === "demo";
  const authLinkError = searchParams.get("error") === "auth";
  const sessionExpired = searchParams.get("error") === "session";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    setUnconfirmed(false);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      const mapped = toUserError(authError.message, "The email or password is incorrect.");
      setError(mapped);
      setUnconfirmed(mapped.includes("confirm your email"));
      setLoading(false);
      return;
    }

    const next = searchParams.get("next");
    router.push(isSafeNextPath(next) ? next : "/dashboard");
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-[32px] font-semibold leading-10">Welcome back</h1>
      <p className="mt-1 text-sm leading-[22px] text-muted-foreground">Sign in to your Awaasly workspace.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-foreground underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordField id="password" name="password" autoComplete="current-password" value={password} onChange={setPassword} />
        </div>
        {sessionExpired && (
          <p className="text-sm text-muted-foreground" role="status">
            Your session has expired. Please sign in again.
          </p>
        )}
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        {unconfirmed ? <ResendConfirmation email={email} /> : null}
        {demoUnavailable && (
          <p className="text-sm text-destructive" role="alert">Demo is temporarily unavailable. Please try again.</p>
        )}
        {authLinkError && (
          <p className="text-sm text-destructive" role="alert">
            That confirmation link is invalid or has expired. Try signing in or create the account again.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href={getDemoHref()}>Explore Demo</Link>
      </Button>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
