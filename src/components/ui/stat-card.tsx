import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  tone?: "default" | "danger" | "success" | "warning";
  className?: string;
  compact?: boolean;
}

const iconTone = {
  default: "bg-muted text-foreground",
  danger: "bg-destructive/10 text-destructive",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  className,
  tone = "default",
  compact = false,
}: StatCardProps) {
  return (
    <Card className={cn("shadow-none", className)}>
      <CardContent className={cn("p-5", compact && "p-4")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className={cn("font-semibold tracking-tight", compact ? "text-xl" : "text-2xl")}>{value}</p>
            {subtitle ? <p className="text-xs leading-4 text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className={cn("rounded-md p-2", iconTone[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatCardCurrency({
  title,
  value,
  subtitle,
  icon,
  tone,
  compact,
  className,
}: Omit<StatCardProps, "value"> & { value: number }) {
  return (
    <StatCard
      title={title}
      value={formatCurrency(value)}
      subtitle={subtitle}
      icon={icon}
      tone={tone}
      compact={compact}
      className={className}
    />
  );
}
