import { AwaaslyLogo } from "@/components/brand/awaasly-logo";

export function AuthShell({
  children,
  showTagline = false,
}: {
  children: React.ReactNode;
  showTagline?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <AwaaslyLogo showTagline={showTagline} />
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-none sm:p-8">{children}</div>
      </div>
    </div>
  );
}
