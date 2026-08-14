import { startOwnWorkspace } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function DemoBanner() {
  return (
    <div className="flex flex-col gap-2 border-b bg-amber-50 px-4 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>You&apos;re exploring the Awaasly demo.</p>
      <form action={startOwnWorkspace}>
        <Button type="submit" size="sm" variant="outline">
          Create Your Own Workspace
        </Button>
      </form>
    </div>
  );
}
