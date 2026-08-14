import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { getAllBeds } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BedStatusBadge } from "@/components/ui/status-badge";
import type { BedStatus } from "@/types/database";

export default async function RoomsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const beds = await getAllBeds(user);

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
      <h1 className="text-2xl font-bold mb-2">Rooms & Beds</h1>
      <p className="text-muted-foreground mb-6">
        {beds.filter((b) => b.status === "available").length} available · {beds.filter((b) => b.status === "occupied").length} occupied
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.values(grouped).map((group) => (
          <Card key={`${group.property}-${group.room}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{group.property}</CardTitle>
              <p className="text-sm text-muted-foreground">Room {group.room}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.beds.map((bed) => (
                <div key={bed.id} className="flex items-center justify-between rounded border p-2">
                  <span className="text-sm font-medium">Bed {bed.bed_label}</span>
                  <BedStatusBadge status={bed.status as BedStatus} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
