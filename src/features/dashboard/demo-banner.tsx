import { startOwnWorkspace } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function DemoBanner() {
  return (
    <div className="flex flex-col gap-2 border-b border-primary/30 bg-primary/15 px-4 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-foreground">
        You&apos;re exploring the Awaasly demo. Changes are disabled here.
      </p>
      <form action={startOwnWorkspace}>
        <Button type="submit" size="sm">
          Start Free
        </Button>
      </form>
    </div>
  );
}
