import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { getActivityLogs } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { formatDate } from "@/lib/utils";

export default async function ActivityPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const logs = await getActivityLogs(user);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Activity" }]} />
      <h1 className="text-2xl font-bold mb-6">Activity Log</h1>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">User</th>
            <th className="px-4 py-3 text-left">Action</th>
            <th className="px-4 py-3 text-left">Entity</th>
          </tr></thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No activity yet</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="px-4 py-3">{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3">{(log.user as { full_name?: string })?.full_name ?? "System"}</td>
                  <td className="px-4 py-3 capitalize">{log.action.replace("_", " ")}</td>
                  <td className="px-4 py-3">{log.entity_type}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
