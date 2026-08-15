import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, canOwn, isOwner } from "@/lib/auth/get-user";
import { getProperties, getPropertyOccupancyMap } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { OccupancyBar } from "@/components/ui/occupancy-bar";

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const { view } = await searchParams;
  const archived = view === "archived";
  const allProperties = await getProperties(user, { includeInactive: true });
  const properties = allProperties.filter((property) =>
    archived ? property.status === "inactive" : property.status === "active"
  );
  const occupancy = await getPropertyOccupancyMap(properties.map((property) => property.id));

  return (
    <div>
      <Breadcrumbs items={[{ label: "Properties" }]} />
      <PageHeader
        title="Properties"
        description={archived ? "Archived properties stay saved with all history." : "Every active PG in this workspace."}
        actions={
          <div className="flex flex-wrap gap-2">
            {isOwner(user) ? (
              <Button asChild variant={archived ? "outline" : "secondary"}>
                <Link href={archived ? "/properties" : "/properties?view=archived"}>
                  {archived ? "Active properties" : "Archived"}
                </Link>
              </Button>
            ) : null}
            {canOwn(user) && !archived ? (
              <Button asChild>
                <Link href="/properties/new"><Plus className="h-4 w-4" />Add Property</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      {properties.length === 0 ? (
        <EmptyState
          title={archived ? "No archived properties" : "No properties yet"}
          description={
            archived
              ? "Archived properties appear here. Reactivate one from its detail page."
              : "Add your first property to start tracking rooms, beds and occupancy."
          }
          action={
            canOwn(user) && !archived ? (
              <Button asChild><Link href="/properties/new">Add Property</Link></Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((prop) => {
            const stats = occupancy.byProperty.get(prop.id);
            return (
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
                      <span>Beds {stats?.total ?? 0}</span>
                      <span>Capacity {stats?.capacity ?? 0}</span>
                      <span className="text-success">Occupied {stats?.occupied ?? 0}</span>
                      <span>Vacant {stats?.vacant ?? 0}</span>
                    </div>
                    <OccupancyBar percent={stats?.occupancyPercent ?? 0} />
                    <p className="text-xs font-medium">{stats?.occupancyPercent ?? 0}% occupancy</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
