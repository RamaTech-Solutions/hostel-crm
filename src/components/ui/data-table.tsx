import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataTable({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border bg-card", className)}>
      <table className="w-full min-w-[640px] text-left text-sm leading-[22px]">{children}</table>
    </div>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b bg-muted/60 text-xs font-medium text-muted-foreground">{children}</tr>
    </thead>
  );
}

export function DataTh({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function DataTr({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={cn("hover:bg-muted/50", className)}>{children}</tr>;
}

export function DataTd({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
