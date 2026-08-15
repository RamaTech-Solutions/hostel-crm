import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { getResidents } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";

export default async function ResidentsReportPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const { rows: residents } = await getResidents(user, { status: "staying" });

  return (
    <div>
      <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: "Residents" }]} />
      <div className="flex justify-between mb-6">
        <h1 className="text-[32px] font-semibold leading-10 tracking-tight">Currently staying</h1>
        <Button asChild variant="outline" size="sm"><Link href="/api/export/residents">Export CSV</Link></Button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Mobile</th>
            <th className="px-4 py-3 text-left">Property</th>
            <th className="px-4 py-3 text-left">Joining</th>
            <th className="px-4 py-3 text-left">Rent</th>
          </tr></thead>
          <tbody>
            {residents.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="px-4 py-3">{r.full_name}</td>
                <td className="px-4 py-3">{r.mobile}</td>
                <td className="px-4 py-3">{(r.property as { name: string })?.name}</td>
                <td className="px-4 py-3">{formatDate(r.joining_date)}</td>
                <td className="px-4 py-3">{formatCurrency(Number(r.monthly_rent))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
