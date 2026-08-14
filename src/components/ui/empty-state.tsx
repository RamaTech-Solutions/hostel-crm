import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-dashed bg-card px-6 py-12 text-center", className)}>
      <h2 className="text-xl font-semibold leading-7">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-[22px] text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
