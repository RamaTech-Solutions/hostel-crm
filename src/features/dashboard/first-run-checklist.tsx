import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardOverview } from "@/lib/dashboard/overview";

export function FirstRunChecklist({
  overview,
  canWrite,
}: {
  overview: DashboardOverview;
  canWrite: boolean;
}) {
  const items = [
    { label: "Add property", done: overview.setup.hasProperty },
    { label: "Add rooms & beds", done: overview.setup.hasRooms },
    { label: "Add first resident", done: overview.setup.hasResidents },
    { label: "Generate rent when residents are ready", done: overview.rent.kind === "complete" },
  ];

  const title = !overview.setup.hasProperty
    ? "Set up your workspace"
    : !overview.setup.hasRooms
      ? "Add rooms & beds"
      : !overview.setup.hasResidents
        ? "Add your first resident"
        : "Generate this month's rent";

  const description = !overview.setup.hasProperty
    ? "Create a property so occupancy and residents have a home."
    : !overview.setup.hasRooms
      ? "Rooms & beds setup is incomplete. Add rooms so you can assign residents and track occupancy."
      : !overview.setup.hasResidents
        ? "Next step: add a resident so occupancy and rent can start updating."
        : "Eligible residents are ready. Generate this month's rent from Payments when you are ready.";

  const actionHref = !overview.setup.hasProperty
    ? "/properties/new"
    : !overview.setup.hasRooms
      ? "/rooms"
      : !overview.setup.hasResidents
        ? "/residents/new"
        : "/payments";
  const actionLabel = !overview.setup.hasProperty
    ? "Add Property"
    : !overview.setup.hasRooms
      ? "Add Rooms & Beds"
      : !overview.setup.hasResidents
        ? "Add your first resident"
        : "Open Payments";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-[22px] text-muted-foreground">{description}</p>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span className={item.done ? "text-success" : "text-muted-foreground"}>{item.done ? "Done" : "To do"}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        {canWrite ? (
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
