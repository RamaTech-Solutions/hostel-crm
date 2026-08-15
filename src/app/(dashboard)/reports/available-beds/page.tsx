import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { getAllBeds } from "@/lib/queries";
import { classifyBed } from "@/lib/inventory/occupancy";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";

export default async function AvailableBedsReportPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const beds = (await getAllBeds(user)).filter((b) => classifyBed({
    status: b.status,
    hasActiveAssignment: Boolean(b.hasActiveAssignment),
  }) === "vacant");

  return (
    <div>
      <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Available Beds" }]} />
      <div className="flex justify-between mb-6">
        <h1 className="text-[32px] font-semibold leading-10 tracking-tight">Vacant beds</h1>
        <Button asChild variant="outline" size="sm"><Link href="/api/export/available-beds">Export CSV</Link></Button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left">Property</th>
            <th className="px-4 py-3 text-left">Room</th>
            <th className="px-4 py-3 text-left">Bed</th>
          </tr></thead>
          <tbody>
            {beds.map((b) => (
              <tr key={b.id} className="border-b">
                <td className="px-4 py-3">{b.property?.name}</td>
                <td className="px-4 py-3">{b.room?.room_number}</td>
                <td className="px-4 py-3">{b.bed_label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
