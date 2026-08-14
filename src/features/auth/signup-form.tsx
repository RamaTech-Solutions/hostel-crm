"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validations/schemas";
import { toUserError } from "@/lib/user-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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

    const origin = window.location.origin;
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
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
      router.push(`/signup/check-email?email=${encodeURIComponent(parsed.data.email)}`);
      return;
    }

    router.push("/onboarding");
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
          <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm Password</Label>
          <Input id="confirm_password" name="confirm_password" type="password" required minLength={8} autoComplete="new-password" />
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
