"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validations/schemas";
import { toUserError } from "@/lib/user-error";
import { authCallbackUrl } from "@/lib/app-url";
import { destinationAfterSignUp, isDemoOrganization, shouldClearSessionBeforeSignUp } from "@/lib/auth/tenant-redirect";
import { validatePassword } from "@/lib/auth/password-policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/features/auth/password-field";
import { PasswordChecklist } from "@/features/auth/password-checklist";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      full_name: form.get("full_name"),
      organization_name: form.get("organization_name"),
      email: form.get("email"),
      password: form.get("password"),
      confirm_password: form.get("confirm_password"),
      phone: form.get("phone") || "",
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
      setLoading(false);
      return;
    }

    if (!validatePassword(parsed.data.password).valid || parsed.data.password !== parsed.data.confirm_password) {
      setError(parsed.data.password !== parsed.data.confirm_password ? "Passwords do not match." : "Choose a stronger password that meets all the requirements below.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { session: existingSession },
    } = await supabase.auth.getSession();
    if (existingSession?.user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", existingSession.user.id)
        .maybeSingle();
      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("is_demo, slug")
          .eq("id", profile.organization_id)
          .maybeSingle();
        if (shouldClearSessionBeforeSignUp(isDemoOrganization(org) ? "demo" : "ready")) {
          await supabase.auth.signOut();
        }
      }
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: authCallbackUrl("/onboarding"),
        data: {
          full_name: parsed.data.full_name,
          organization_name: parsed.data.organization_name,
          phone: parsed.data.phone,
        },
      },
    });

    if (signUpError) {
      setError(toUserError(signUpError.message));
      setLoading(false);
      return;
    }

    if (!data.session) {
      setLoading(false);
      router.push(`/signup/check-email?email=${encodeURIComponent(parsed.data.email)}`);
      return;
    }

    if (data.user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from("organizations")
          .select("is_demo, slug")
          .eq("id", profile.organization_id)
          .maybeSingle();
        if (isDemoOrganization(org)) {
          await supabase.auth.signOut();
          setError("This account could not be created. Please try again.");
          setLoading(false);
          return;
        }
      }
    }

    router.push(destinationAfterSignUp(data.session));
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-[32px] font-semibold leading-10">Awaasly</h1>
      <p className="mt-1 text-sm leading-[22px] text-muted-foreground">Create your PG management workspace.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input id="full_name" name="full_name" required autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="organization_name">Business / PG Name</Label>
          <Input id="organization_name" name="organization_name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile Number</Label>
          <Input id="phone" name="phone" inputMode="numeric" required pattern="\d{10}" placeholder="10-digit mobile" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordField id="password" name="password" autoComplete="new-password" value={password} onChange={setPassword} />
          <PasswordChecklist password={password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm Password</Label>
          <PasswordField
            id="confirm_password"
            name="confirm_password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          {confirmPassword && confirmPassword !== password ? (
            <p className="text-sm text-destructive" role="alert">Passwords do not match.</p>
          ) : null}
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Create My Awaasly Account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Login
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">A product of Ramatech Innovation Pvt Ltd</p>
    </div>
  );
}
