import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStats } from "@/types/database";

export function FirstRunChecklist({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: "Create account", done: true },
    { label: "Add property", done: stats.totalProperties > 0 },
    { label: "Configure rooms", done: stats.totalRooms > 0 },
    { label: "Add first resident", done: stats.activeResidents > 0 },
    { label: "Record first payment", done: stats.rentCollected > 0 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your property is ready.</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Next step: add your first resident so occupancy and collections start updating.
        </p>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.label}>
              {item.done ? "✓" : "○"} {item.label}
            </li>
          ))}
        </ul>
        <Button asChild>
          <Link href="/residents/new">Add your first resident</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
