import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const reports = [
  { href: "/reports/occupancy", title: "Occupancy Report", desc: "Property-wise bed occupancy rates" },
  { href: "/reports/residents", title: "Resident Report", desc: "Current active residents list" },
  { href: "/reports/payments", title: "Payment Report", desc: "Paid, pending, and overdue payments" },
  { href: "/reports/available-beds", title: "Available Beds", desc: "All currently vacant beds" },
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
