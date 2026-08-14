import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { getActivityLogs } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, DataTableHead, DataTh, DataTableBody, DataTr, DataTd } from "@/components/ui/data-table";

export default async function ActivityPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const logs = await getActivityLogs(user);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Activity" }]} />
      <PageHeader title="Activity" description="Recent changes across this workspace." />
      {logs.length === 0 ? (
        <EmptyState title="No activity yet" description="Actions like adding residents and recording payments will appear here." />
      ) : (
      <DataTable>
        <DataTableHead>
            <DataTh>Date</DataTh>
            <DataTh>User</DataTh>
            <DataTh>Action</DataTh>
            <DataTh>Entity</DataTh>
        </DataTableHead>
        <DataTableBody>
              {logs.map((log) => (
                <DataTr key={log.id}>
                  <DataTd>{formatDate(log.created_at)}</DataTd>
                  <DataTd>{(log.user as { full_name?: string })?.full_name ?? "System"}</DataTd>
                  <DataTd className="capitalize">{log.action.replace("_", " ")}</DataTd>
                  <DataTd>{log.entity_type}</DataTd>
                </DataTr>
              ))}
        </DataTableBody>
      </DataTable>
      )}
    </div>
  );
}
