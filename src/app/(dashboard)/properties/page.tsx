import Link from "next/link";
import { getAuthUser } from "@/lib/auth/get-user";
import { redirect } from "next/navigation";
import { getProperties } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Phone } from "lucide-react";
import { isOwner } from "@/lib/auth/get-user";

export default async function PropertiesPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const properties = await getProperties(user);
  const supabase = await createClient();

  const propertiesWithStats = await Promise.all(
    properties.map(async (prop) => {
      const { data: beds } = await supabase
        .from("beds")
        .select("status")
        .eq("property_id", prop.id);
      const total = beds?.length ?? 0;
      const occupied = beds?.filter((b) => b.status === "occupied").length ?? 0;
      return { ...prop, totalBeds: total, occupiedBeds: occupied, occupancy: total > 0 ? Math.round((occupied / total) * 100) : 0 };
    })
  );

  return (
    <div>
      <Breadcrumbs items={[{ label: "Properties" }]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-muted-foreground">Manage your PG locations</p>
        </div>
        {isOwner(user) && (
          <Button asChild>
            <Link href="/properties/new"><Plus className="h-4 w-4 mr-2" />Add Property</Link>
          </Button>
        )}
      </div>

      {propertiesWithStats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No properties yet</p>
            {isOwner(user) && (
              <Button asChild><Link href="/properties/new">Add your first property</Link></Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {propertiesWithStats.map((prop) => (
            <Link key={prop.id} href={`/properties/${prop.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{prop.name}</CardTitle>
                    <Badge variant={prop.status === "active" ? "success" : "secondary"}>{prop.status}</Badge>
                  </div>
                  {prop.internal_code && (
                    <p className="text-xs text-muted-foreground">Code: {prop.internal_code}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{prop.address_line}, {prop.city}</span>
                  </div>
                  {prop.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{prop.contact_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm">Occupancy</span>
                    <span className="font-semibold text-primary">{prop.occupancy}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {prop.occupiedBeds} / {prop.totalBeds} beds occupied
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
