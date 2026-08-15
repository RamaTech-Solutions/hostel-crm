import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AwaaslyLogo } from "@/components/brand/awaasly-logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <AwaaslyLogo variant="stacked" placement="auth" />
      <h1 className="mt-10 text-[32px] font-semibold leading-10">Page not found</h1>
      <p className="mt-2 max-w-md text-sm leading-[22px] text-muted-foreground">
        That link does not exist. Head back to Awaasly to continue managing your properties.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Go to Awaasly</Link>
      </Button>
    </div>
  );
}
