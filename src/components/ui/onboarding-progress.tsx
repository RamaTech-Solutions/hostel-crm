import { cn } from "@/lib/utils";

export function OnboardingProgress({
  steps,
  currentIndex,
}: {
  steps: readonly string[];
  currentIndex: number;
}) {
  return (
    <ol className="mb-6 flex flex-wrap gap-2">
      {steps.map((label, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <li key={label} className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
                (done || active) && "bg-primary text-primary-foreground",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {index + 1}
            </span>
            <span className={cn("text-xs font-medium", active ? "text-foreground" : "text-muted-foreground")}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
