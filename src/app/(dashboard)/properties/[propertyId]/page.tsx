import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAuthUser, canAccessProperty, canWrite, canOwn } from "@/lib/auth/get-user";
import { getProperty, getPropertyStats, getRoomsWithBeds, getFloors, getProperties } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StatCard, StatCardCurrency } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BedDouble, DoorOpen, Users, IndianRupee, Plus } from "lucide-react";
import { InventoryPanel } from "@/features/properties/inventory-panel";
import { PropertySwitcher } from "@/features/properties/property-switcher";
import { PropertyArchiveActions } from "@/features/properties/property-archive-actions";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!canAccessProperty(user, propertyId)) redirect("/properties");

  const [property, stats, rooms, floors, activeProperties] = await Promise.all([
    getProperty(propertyId),
    getPropertyStats(propertyId),
    getRoomsWithBeds(propertyId),
    getFloors(propertyId),
    getProperties(user),
  ]);

  if (!property) notFound();

  const switcherProperties =
    property.status === "active"
      ? activeProperties
      : [{ id: property.id, name: property.name }, ...activeProperties.filter((item) => item.id !== property.id)];

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Properties", href: "/properties" },
          { label: property.name },
        ]}
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-[32px] font-semibold leading-10 tracking-tight">{property.name}</h1>
            <Badge variant={property.status === "active" ? "success" : "secondary"}>{property.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {property.address_line}, {property.city}, {property.state} — {property.pincode}
          </p>
          {property.manager && (
            <p className="text-sm text-muted-foreground mt-1">
              Manager: {(property.manager as { full_name: string }).full_name}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <PropertySwitcher properties={switcherProperties} currentId={propertyId} basePath="/properties" />
          <div className="flex flex-wrap gap-2">
            {canOwn(user) ? (
              <>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/properties/${propertyId}/edit`}>Edit property</Link>
                </Button>
                <PropertyArchiveActions propertyId={propertyId} status={property.status} />
              </>
            ) : null}
            {canWrite(user) ? (
              <Button size="sm" asChild>
                <Link href={`#add-room`}><Plus className="h-4 w-4 mr-1" />Add Room</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Rooms" value={stats.totalRooms} icon={DoorOpen} />
        <StatCard title="Beds" value={stats.totalBeds} subtitle={`${stats.availableBeds} vacant`} icon={BedDouble} />
        <StatCard title="Occupancy" value={`${stats.occupancyPercent}%`} icon={Users} />
        <StatCardCurrency title="Expected Revenue" value={stats.monthlyExpectedRevenue} icon={IndianRupee} />
      </div>

      <InventoryPanel
        propertyId={propertyId}
        floors={floors}
        rooms={rooms}
        canWriteRooms={canWrite(user)}
        canManageFloors={canOwn(user)}
      />
    </div>
  );
}
