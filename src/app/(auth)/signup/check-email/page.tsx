import Link from "next/link";
import { Button } from "@/components/ui/button";

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
        We&apos;ve sent a confirmation link{email ? ` to ${email}` : ""}. Open it to verify your account, then continue setup.
      </p>
      <p className="mt-4 text-sm leading-[22px] text-muted-foreground">
        If you do not see the email, check spam. The link expires after a short time.
      </p>
      <Button asChild variant="outline" className="mt-6 w-full">
        <Link href="/login">Back to login</Link>
      </Button>
    </div>
  );
}
