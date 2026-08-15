"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/validations/schemas";
import { authCallbackUrl } from "@/lib/app-url";
import { toUserError } from "@/lib/user-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const NEUTRAL_MESSAGE = "If an Awaasly account exists for this email, we've sent password reset instructions.";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({ email: form.get("email") });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: authCallbackUrl("/reset-password"),
      });
      if (error) {
        const mapped = toUserError(error.message);
        if (mapped.includes("Too many") || mapped.includes("couldn't reach")) {
          setError(mapped);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.toLowerCase().includes("network") || message.toLowerCase().includes("fetch")) {
        setError(toUserError(message));
        setLoading(false);
        return;
      }
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-[32px] font-semibold leading-10">Forgot password</h1>
      <p className="mt-1 text-sm leading-[22px] text-muted-foreground">
        Enter your email and we&apos;ll send reset instructions if an account exists.
      </p>

      {sent ? (
        <p className="mt-6 text-sm leading-[22px] text-foreground" role="status">
          {NEUTRAL_MESSAGE}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Back to Login
        </Link>
      </p>
    </div>
  );
}
