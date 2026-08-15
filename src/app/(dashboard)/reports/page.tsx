import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const reports = [
  { href: "/reports/occupancy", title: "Occupancy Report", desc: "Property-wise bed occupancy (occupied / operational capacity)" },
  { href: "/reports/residents", title: "Resident Report", desc: "Currently staying residents (active and notice period)" },
  { href: "/reports/payments", title: "Receipts Report", desc: "Received payment receipts — not rent charge outstanding" },
  { href: "/reports/available-beds", title: "Vacant Beds", desc: "Usable beds without an active assignment" },
];

export default async function ReportsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div>
      <Breadcrumbs items={[{ label: "Reports" }]} />
      <PageHeader title="Reports" description="Export occupancy, residents, payments and vacant beds." />
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.href}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileBarChart className="h-5 w-5" />{r.title}
              </CardTitle>
              <CardDescription>{r.desc}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild size="sm"><Link href={r.href}>View Report</Link></Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/api/export/${r.href.split("/").pop()}`}>
                  <Download className="h-4 w-4 mr-1" />CSV
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
