import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, canWrite } from "@/lib/auth/get-user";
import { getResidents, getProperties } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResidentStatusBadge } from "@/components/ui/status-badge";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate, getInitials, maskIdNumber } from "@/lib/utils";
import { Suspense } from "react";
import { ResidentsFilters } from "@/features/residents/residents-filters";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResidentStatus } from "@/types/database";

export default async function ResidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; status?: string; search?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const [residents, properties] = await Promise.all([
    getResidents(user, {
      propertyId: params.property,
      status: params.status,
      search: params.search,
    }),
    getProperties(user),
  ]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Residents" }]} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Residents</h1>
          <p className="text-muted-foreground">{residents.length} residents found</p>
        </div>
        {canWrite(user) && (
          <Button asChild>
            <Link href="/residents/new"><Plus className="h-4 w-4 mr-2" />Add Resident</Link>
          </Button>
        )}
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full max-w-xl" />}>
        <ResidentsFilters properties={properties} />
      </Suspense>

      {residents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No residents found. {canWrite(user) && "Start by onboarding a new resident."}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Resident</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Mobile</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Property</th>
                  <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Room / Bed</th>
                  <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Joining</th>
                  <th className="px-4 py-3 text-left font-medium">Rent</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((resident) => {
                  const assignment = resident.bed_assignment as {
                    bed?: { bed_label: string };
                    room?: { room_number: string };
                  } | null;
                  const property = resident.property as { name: string } | null;
                  return (
                    <tr key={resident.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/residents/${resident.id}`} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {resident.photo_url && <AvatarImage src={resident.photo_url} />}
                            <AvatarFallback className="text-xs">{getInitials(resident.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{resident.full_name}</p>
                            <p className="text-xs text-muted-foreground">{maskIdNumber(resident.id_number_masked)}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">{resident.mobile}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">{property?.name ?? "—"}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {assignment?.room ? `${assignment.room.room_number}-${assignment.bed?.bed_label}` : "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">{formatDate(resident.joining_date)}</td>
                      <td className="px-4 py-3">{formatCurrency(Number(resident.monthly_rent))}</td>
                      <td className="px-4 py-3">
                        <ResidentStatusBadge status={resident.status as ResidentStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
