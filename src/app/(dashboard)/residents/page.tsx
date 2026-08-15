import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, canWrite } from "@/lib/auth/get-user";
import { getResidents, getProperties } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResidentStatusBadge } from "@/components/ui/status-badge";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate, getInitials, maskIdNumber } from "@/lib/utils";
import { Suspense } from "react";
import { ResidentsFilters } from "@/features/residents/residents-filters";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResidentStatus } from "@/types/database";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, DataTableHead, DataTh, DataTableBody, DataTr, DataTd } from "@/components/ui/data-table";

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
      <PageHeader
        title="Residents"
        description={`${residents.length} residents`}
        actions={
          canWrite(user) ? (
            <Button asChild>
              <Link href="/residents/new"><Plus className="h-4 w-4" />Add Resident</Link>
            </Button>
          ) : null
        }
      />

      <Suspense fallback={<Skeleton className="mb-4 h-10 w-full max-w-xl" />}>
        <ResidentsFilters properties={properties} />
      </Suspense>

      {residents.length === 0 ? (
        <EmptyState
          title={params.search || params.property || params.status ? "No matching residents" : "No residents yet"}
          description={
            params.search || params.property || params.status
              ? "Try another name, mobile, property or status. Former residents stay searchable."
              : "Add your first resident to start tracking occupancy and rent."
          }
          action={
            canWrite(user) && !params.search && !params.property && !params.status ? (
              <Button asChild><Link href="/residents/new">Add Resident</Link></Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
            <DataTable>
              <DataTableHead>
                <DataTh>Resident</DataTh>
                <DataTh className="hidden lg:table-cell">Property</DataTh>
                <DataTh className="hidden lg:table-cell">Room / Bed</DataTh>
                <DataTh>Rent</DataTh>
                <DataTh>Status</DataTh>
                <DataTh className="hidden lg:table-cell">Joining</DataTh>
              </DataTableHead>
              <DataTableBody>
                {residents.map((resident) => {
                  const assignment = resident.bed_assignment as {
                    bed?: { bed_label: string };
                    room?: { room_number: string };
                  } | null;
                  const property = resident.property as { name: string } | null;
                  return (
                    <DataTr key={resident.id}>
                      <DataTd>
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
                      </DataTd>
                      <DataTd className="hidden lg:table-cell">{property?.name ?? "—"}</DataTd>
                      <DataTd className="hidden lg:table-cell">
                        {assignment?.room ? `${assignment.room.room_number}-${assignment.bed?.bed_label}` : "—"}
                      </DataTd>
                      <DataTd>{formatCurrency(Number(resident.monthly_rent))}</DataTd>
                      <DataTd>
                        <ResidentStatusBadge status={resident.status as ResidentStatus} />
                      </DataTd>
                      <DataTd className="hidden lg:table-cell">{formatDate(resident.joining_date)}</DataTd>
                    </DataTr>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </div>

          <div className="space-y-3 md:hidden">
            {residents.map((resident) => {
              const assignment = resident.bed_assignment as {
                bed?: { bed_label: string };
                room?: { room_number: string };
              } | null;
              const property = resident.property as { name: string } | null;
              return (
                <Link key={resident.id} href={`/residents/${resident.id}`} className="block rounded-lg border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{resident.full_name}</p>
                      <p className="text-xs text-muted-foreground">{property?.name ?? "—"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {assignment?.room ? `${assignment.room.room_number}-${assignment.bed?.bed_label}` : "No bed"}
                      </p>
                    </div>
                    <ResidentStatusBadge status={resident.status as ResidentStatus} />
                  </div>
                  <p className="mt-3 text-sm font-medium">{formatCurrency(Number(resident.monthly_rent))}</p>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
