import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { getAllBeds } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BedStatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { BedStatus } from "@/types/database";

export default async function RoomsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const beds = await getAllBeds(user);
  const vacant = beds.filter((b) => b.status === "available").length;
  const occupied = beds.filter((b) => b.status === "occupied").length;

  const grouped = beds.reduce((acc, bed) => {
    const propName = bed.property?.name ?? "Unknown";
    const roomNum = bed.room?.room_number ?? "?";
    const key = `${propName}::${roomNum}`;
    if (!acc[key]) acc[key] = { property: propName, room: roomNum, beds: [] };
    acc[key].beds.push(bed);
    return acc;
  }, {} as Record<string, { property: string; room: string; beds: typeof beds }>);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Rooms & Beds" }]} />
      <PageHeader
        title="Rooms & Beds"
        description={`${vacant} vacant · ${occupied} occupied`}
      />

      {beds.length === 0 ? (
        <EmptyState
          title="No rooms yet"
          description="Add rooms on a property so you can assign beds and track occupancy."
          action={
            <Button asChild><Link href="/properties">Go to Properties</Link></Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.values(grouped).map((group) => (
            <Card key={`${group.property}-${group.room}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{group.property}</CardTitle>
                <p className="text-sm text-muted-foreground">Room {group.room}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.beds.map((bed) => (
                  <div key={bed.id} className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm font-medium">Bed {bed.bed_label}</span>
                    <BedStatusBadge status={bed.status as BedStatus} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
