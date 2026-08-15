import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ResendConfirmation } from "@/features/auth/resend-confirmation";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div>
      <h1 className="text-[32px] font-semibold leading-10">Check your email</h1>
      <p className="mt-2 text-sm leading-[22px] text-muted-foreground">
        We&apos;ve sent a confirmation link to your email address.
        {email ? ` (${email})` : ""}
      </p>
      <ResendConfirmation email={email ?? ""} />
      <Button asChild variant="outline" className="mt-4 w-full">
        <Link href="/login">Back to Login</Link>
      </Button>
    </div>
  );
}
