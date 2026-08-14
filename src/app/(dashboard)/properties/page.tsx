import Link from "next/link";
import { getAuthUser } from "@/lib/auth/get-user";
import { redirect } from "next/navigation";
import { getProperties } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { isOwner } from "@/lib/auth/get-user";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { OccupancyBar } from "@/components/ui/occupancy-bar";

export default async function PropertiesPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const properties = await getProperties(user);
  const supabase = await createClient();

  const propertiesWithStats = await Promise.all(
    properties.map(async (prop) => {
      const [{ data: beds }, { count: roomCount }] = await Promise.all([
        supabase.from("beds").select("status").eq("property_id", prop.id),
        supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", prop.id),
      ]);
      const total = beds?.length ?? 0;
      const occupied = beds?.filter((b) => b.status === "occupied").length ?? 0;
      const vacant = beds?.filter((b) => b.status === "available").length ?? 0;
      return {
        ...prop,
        rooms: roomCount ?? 0,
        totalBeds: total,
        occupiedBeds: occupied,
        vacantBeds: vacant,
        occupancy: total > 0 ? Math.round((occupied / total) * 100) : 0,
      };
    })
  );

  return (
    <div>
      <Breadcrumbs items={[{ label: "Properties" }]} />
      <PageHeader
        title="Properties"
        description="Every PG in this workspace."
        actions={
          isOwner(user) ? (
            <Button asChild>
              <Link href="/properties/new"><Plus className="h-4 w-4" />Add Property</Link>
            </Button>
          ) : null
        }
      />

      {propertiesWithStats.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="Add your first property to start tracking rooms, beds and occupancy."
          action={
            isOwner(user) ? (
              <Button asChild><Link href="/properties/new">Add Property</Link></Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {propertiesWithStats.map((prop) => (
            <Link key={prop.id} href={`/properties/${prop.id}`}>
              <Card className="h-full cursor-pointer transition-colors hover:bg-muted/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{prop.name}</CardTitle>
                    <Badge variant={prop.status === "active" ? "success" : "secondary"}>{prop.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <span>Rooms {prop.rooms}</span>
                    <span>Beds {prop.totalBeds}</span>
                    <span className="text-success">Occupied {prop.occupiedBeds}</span>
                    <span>Vacant {prop.vacantBeds}</span>
                  </div>
                  <OccupancyBar percent={prop.occupancy} />
                  <p className="text-xs font-medium">{prop.occupancy}% occupancy</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
