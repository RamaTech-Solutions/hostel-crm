import type { BedStatus, ResidentStatus, PaymentStatus } from "@/types/database";
import { Badge } from "@/components/ui/badge";

const bedStatusConfig: Record<BedStatus, { label: string; variant: "success" | "default" | "warning" | "secondary" }> = {
  available: { label: "Available", variant: "success" },
  occupied: { label: "Occupied", variant: "default" },
  reserved: { label: "Reserved", variant: "warning" },
  maintenance: { label: "Maintenance", variant: "secondary" },
};

const residentStatusConfig: Record<ResidentStatus, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
  active: { label: "Active", variant: "success" },
  notice_period: { label: "Notice Period", variant: "warning" },
  checked_out: { label: "Checked Out", variant: "secondary" },
  blacklisted: { label: "Restricted", variant: "destructive" },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  paid: { label: "Paid", variant: "success" },
  partial: { label: "Partial", variant: "warning" },
  pending: { label: "Pending", variant: "secondary" },
  overdue: { label: "Overdue", variant: "destructive" },
};

export function BedStatusBadge({ status }: { status: BedStatus }) {
  const config = bedStatusConfig[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function ResidentStatusBadge({ status }: { status: ResidentStatus }) {
  const config = residentStatusConfig[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = paymentStatusConfig[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
