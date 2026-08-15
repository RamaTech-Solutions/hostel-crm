import { createClient } from "@/lib/supabase/server";
import { InvalidResetLink, ResetPasswordForm } from "@/features/auth/reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <InvalidResetLink />;
  }

  return <ResetPasswordForm />;
}
