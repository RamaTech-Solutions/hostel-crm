import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { getOccupancyByProperty } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";

export default async function OccupancyReportPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const data = await getOccupancyByProperty(user);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Occupancy" }]} />
      <div className="flex justify-between mb-6">
        <h1 className="text-[32px] font-semibold leading-10 tracking-tight">Occupancy</h1>
        <Button asChild variant="outline" size="sm"><Link href="/api/export/occupancy">Export CSV</Link></Button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left">Property</th>
            <th className="px-4 py-3 text-left">Occupied</th>
            <th className="px-4 py-3 text-left">Total Beds</th>
            <th className="px-4 py-3 text-left">Occupancy %</th>
          </tr></thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.name} className="border-b">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">{row.occupied}</td>
                <td className="px-4 py-3">{row.total}</td>
                <td className="px-4 py-3">{row.occupancy}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
