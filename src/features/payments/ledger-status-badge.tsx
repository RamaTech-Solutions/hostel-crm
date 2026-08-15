import { Badge } from "@/components/ui/badge";
import type { LedgerStatus } from "@/types/database";

const config: Record<LedgerStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" | "default" }> = {
  paid: { label: "Paid", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  overdue: { label: "Overdue", variant: "destructive" },
  due: { label: "Due", variant: "default" },
  voided: { label: "Cancelled", variant: "secondary" },
};

export function LedgerStatusBadge({ status }: { status: LedgerStatus }) {
  const item = config[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}
