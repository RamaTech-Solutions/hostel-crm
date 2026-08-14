"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validations/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const form = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      full_name: form.get("full_name"),
      organization_name: form.get("organization_name"),
      email: form.get("email"),
      password: form.get("password"),
      phone: form.get("phone") || "",
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid details");
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
          phone: parsed.data.phone || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setInfo("Check your email to confirm your account, then continue to onboarding.");
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Building2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">Awaasly</CardTitle>
        <CardDescription>Create your PG management workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Your name</Label>
            <Input id="full_name" name="full_name" required autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organization_name">Business / PG name</Label>
            <Input id="organization_name" name="organization_name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" name="phone" inputMode="numeric" pattern="\d{10}" placeholder="10-digit mobile" />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {info && <p className="text-sm text-muted-foreground" role="status">{info}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          A product of Ramatech Innovation Pvt Ltd
        </p>
      </CardContent>
    </Card>
  );
}
