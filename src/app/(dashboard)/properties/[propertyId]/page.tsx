import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAuthUser, canAccessProperty, canWrite } from "@/lib/auth/get-user";
import { getProperty, getPropertyStats, getRoomsWithBeds } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StatCard, StatCardCurrency } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BedStatusBadge } from "@/components/ui/status-badge";
import { BedDouble, DoorOpen, Users, IndianRupee, Plus } from "lucide-react";
import { RoomForm } from "@/features/properties/room-form";
import { EmptyState } from "@/components/ui/empty-state";
import type { BedStatus } from "@/types/database";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!canAccessProperty(user, propertyId)) redirect("/properties");

  const [property, stats, rooms] = await Promise.all([
    getProperty(propertyId),
    getPropertyStats(propertyId),
    getRoomsWithBeds(propertyId),
  ]);

  if (!property) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Properties", href: "/properties" },
          { label: property.name },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-[32px] font-semibold leading-10 tracking-tight">{property.name}</h1>
        <p className="text-muted-foreground">
          {property.address_line}, {property.city}, {property.state} — {property.pincode}
        </p>
        {property.manager && (
          <p className="text-sm text-muted-foreground mt-1">
            Manager: {(property.manager as { full_name: string }).full_name}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Rooms" value={stats.totalRooms} icon={DoorOpen} />
        <StatCard title="Beds" value={stats.totalBeds} subtitle={`${stats.availableBeds} available`} icon={BedDouble} />
        <StatCard title="Occupancy" value={`${stats.occupancyPercent}%`} icon={Users} />
        <StatCardCurrency title="Expected Revenue" value={stats.monthlyExpectedRevenue} icon={IndianRupee} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Rooms & Beds</h2>
            {canWrite(user) && (
              <Button size="sm" asChild>
                <Link href={`#add-room`}><Plus className="h-4 w-4 mr-1" />Add Room</Link>
              </Button>
            )}
          </div>

          {rooms.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <EmptyState title="No rooms yet" description="Add your first room so you can assign beds." />
              </CardContent>
            </Card>
          ) : (
            rooms.map((room) => (
              <Card key={room.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Room {room.room_number}</span>
                    <span className="text-sm font-normal text-muted-foreground">₹{room.monthly_rent}/mo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {(room.beds ?? []).map((bed) => {
                      const resident = bed.assignment?.resident;
                      return (
                        <div
                          key={bed.id}
                          className={`rounded-lg border p-3 ${
                            bed.status === "occupied" ? "border-success/30 bg-success/10" :
                            bed.status === "available" ? "border-primary/30 bg-primary/10" :
                            bed.status === "reserved" ? "border-warning/30 bg-warning/10" :
                            "border-border bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">Bed {bed.bed_label}</span>
                            <BedStatusBadge status={bed.status as BedStatus} />
                          </div>
                          {resident ? (
                            <Link href={`/residents/${resident.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                              {resident.full_name}
                            </Link>
                          ) : (
                            <p className="text-sm text-muted-foreground">Vacant</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {canWrite(user) && (
          <div id="add-room">
            <RoomForm propertyId={propertyId} />
          </div>
        )}
      </div>
    </div>
  );
}
