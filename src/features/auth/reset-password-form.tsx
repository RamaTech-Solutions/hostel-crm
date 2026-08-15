"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema } from "@/lib/validations/schemas";
import { validatePassword } from "@/lib/auth/password-policy";
import { toUserError } from "@/lib/user-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/features/auth/password-field";
import { PasswordChecklist } from "@/features/auth/password-checklist";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    const parsed = resetPasswordSchema.safeParse({
      password,
      confirm_password: confirmPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
      setLoading(false);
      return;
    }
    if (!validatePassword(parsed.data.password).valid) {
      setError("Choose a stronger password that meets all the requirements below.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (updateError) {
      setError(toUserError(updateError.message));
      setLoading(false);
      return;
    }

    setUpdated(true);
    setLoading(false);
  }

  if (updated) {
    return (
      <div>
        <h1 className="text-[32px] font-semibold leading-10">Password updated</h1>
        <p className="mt-2 text-sm leading-[22px] text-foreground" role="status">
          Password updated successfully.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link href="/dashboard">Continue to Awaasly</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[32px] font-semibold leading-10">Set a new password</h1>
      <p className="mt-1 text-sm leading-[22px] text-muted-foreground">Choose a password that meets Awaasly&apos;s requirements.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <PasswordField id="password" name="password" autoComplete="new-password" value={password} onChange={setPassword} />
          <PasswordChecklist password={password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm New Password</Label>
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
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  );
}

export function InvalidResetLink() {
  return (
    <div>
      <h1 className="text-[32px] font-semibold leading-10">Reset link expired</h1>
      <p className="mt-2 text-sm leading-[22px] text-muted-foreground">
        This password reset link is invalid or has expired.
      </p>
      <Button asChild className="mt-6 w-full">
        <Link href="/forgot-password">Request a New Reset Link</Link>
      </Button>
    </div>
  );
}
