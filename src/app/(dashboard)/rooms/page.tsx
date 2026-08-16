import { redirect } from "next/navigation";
import { getAuthUser, canWrite } from "@/lib/auth/get-user";
import { getAllBeds, getProperties } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BedStatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PropertySwitcher } from "@/features/properties/property-switcher";
import { classifyBed, summarizeOccupancy } from "@/lib/inventory/occupancy";
import Link from "next/link";
import type { BedStatus } from "@/types/database";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const { propertyId } = await searchParams;
  const properties = await getProperties(user);
  const selectedId = properties.some((property) => property.id === propertyId)
    ? propertyId
    : properties[0]?.id;
  const beds = await getAllBeds(user, selectedId);
  const occupancy = summarizeOccupancy(
    beds.map((bed) => ({
      status: bed.status,
      hasActiveAssignment: Boolean(bed.hasActiveAssignment),
    }))
  );

  const grouped = beds.reduce((acc, bed) => {
    const propName = bed.property?.name ?? "Unknown";
    const roomNum = bed.room?.room_number ?? "?";
    const key = `${propName}::${roomNum}`;
    if (!acc[key]) acc[key] = { property: propName, room: roomNum, beds: [] };
    acc[key].beds.push(bed);
    return acc;
  }, {} as Record<string, { property: string; room: string; beds: typeof beds }>);

  const addHref = selectedId ? `/properties/${selectedId}` : "/properties";

  return (
    <div>
      <Breadcrumbs items={[{ label: "Rooms & Beds" }]} />
      <PageHeader
        title="Rooms & Beds"
        description={`${occupancy.vacant} vacant · ${occupancy.occupied} occupied · ${occupancy.unavailable} unavailable`}
        actions={
          <div className="flex flex-col gap-2 sm:items-end">
            <PropertySwitcher properties={properties} currentId={selectedId} basePath="/rooms" />
            {canWrite(user) && selectedId ? (
              <Button asChild size="sm">
                <Link href={addHref}>Add room</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {beds.length === 0 ? (
        <EmptyState
          title="No rooms yet"
          description="Add rooms on a property so you can assign beds and track occupancy."
          action={
            <Button asChild><Link href={addHref}>{selectedId ? "Add rooms" : "Go to Properties"}</Link></Button>
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
                {group.beds.map((bed) => {
                  const category = classifyBed({
                    status: bed.status,
                    hasActiveAssignment: Boolean(bed.hasActiveAssignment),
                  });
                  return (
                    <div key={bed.id} className="flex items-center justify-between rounded-md border p-2">
                      <span className="text-sm font-medium">Bed {bed.bed_label}</span>
                      <span className="flex items-center gap-2">
                        {bed.hasNoticeOccupant ? <Badge variant="warning">On notice</Badge> : null}
                        <span className="text-xs text-muted-foreground capitalize">{category}</span>
                        <BedStatusBadge status={bed.status as BedStatus} />
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
