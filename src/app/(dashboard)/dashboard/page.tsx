import { getAuthUser, canWrite } from "@/lib/auth/get-user";
import { notFound, redirect } from "next/navigation";
import { getDashboardOverview } from "@/lib/dashboard/load";
import { dashboardDestinations } from "@/lib/dashboard/links";
import { monthStart } from "@/lib/finance/period";
import { canShowGenerateRentAction } from "@/lib/dashboard/rent-readiness";
import { StatCard, StatCardCurrency } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Building2,
  Users,
  IndianRupee,
  AlertCircle,
  BedDouble,
  FileText,
  Contact,
  LogOut,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { FirstRunChecklist } from "@/features/dashboard/first-run-checklist";
import { DashboardPropertyScope } from "@/features/dashboard/property-scope";
import { GenerateRentButton } from "@/features/payments/generate-rent-button";
import { Button } from "@/components/ui/button";

function formatCalendarDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return formatDate(new Date(year, month - 1, day));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const loaded = await getDashboardOverview(user, params.property);
  if (!loaded.ok) notFound();

  const overview = loaded.overview;
  const periodStart = monthStart(new Date());
  const dest = dashboardDestinations(overview.selectedPropertyId, periodStart);
  const writer = canWrite(user);
  const allScope = overview.selectedPropertyId === null;
  const showGenerate = canShowGenerateRentAction({
    missing: overview.rent.missing,
    canWrite: writer,
    allPropertiesScope: allScope,
  });
  const showSetup = !overview.setup.hasResidents;
  const greeting = getGreeting();
  const allLabel = user.role === "owner" ? "All Active Properties" : "All Assigned Properties";

  const rentCard = rentCardProps(overview.rent, dest.outstanding);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[32px] font-semibold leading-10 tracking-tight">
            {greeting}, {user.profile.full_name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm leading-[22px] text-muted-foreground">
            {overview.selectedPropertyId
              ? `What's happening at ${overview.selectorProperties.find((p) => p.id === overview.selectedPropertyId)?.name ?? "this property"}`
              : user.role === "owner"
                ? "What's happening across your properties"
                : "Overview of your assigned properties"}
          </p>
        </div>
        <DashboardPropertyScope
          properties={overview.selectorProperties}
          currentId={overview.selectedPropertyId}
          allLabel={allLabel}
        />
      </div>

      {showSetup ? <FirstRunChecklist overview={overview} canWrite={writer} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Properties" value={overview.totalProperties} icon={Building2} href={dest.properties} />
        <StatCard
          title="Occupancy"
          value={overview.occupancy.total === 0 ? "—" : `${overview.occupancy.occupancyPercent}%`}
          subtitle={
            overview.occupancy.total === 0
              ? "No rooms yet"
              : `${overview.occupancy.occupied} occupied · ${overview.occupancy.vacant} vacant`
          }
          icon={BedDouble}
          href={dest.occupancy}
        />
        <StatCard title="Active Residents" value={overview.stayingCount} icon={Users} href={dest.residents} />
        {rentCard}
      </div>

      {showGenerate ? (
        <div className="flex flex-wrap items-center gap-3">
          <GenerateRentButton periodStart={periodStart} />
        </div>
      ) : overview.rent.missing > 0 && writer ? (
        <Button asChild variant="outline">
          <Link href={dest.payments}>Open Payments to generate rent</Link>
        </Button>
      ) : null}

      <NeedsAttention overview={overview} dest={dest} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Property overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overview.propertyOverview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active properties in this view.</p>
            ) : (
              overview.propertyOverview.map((row) => (
                <Link
                  key={row.id}
                  href={`/dashboard?property=${row.id}`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <span className="min-w-0 truncate font-medium">{row.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {row.occupancyPercent}% · {row.vacant} vacant
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent receipts</CardTitle>
            <Link href={dest.payments} className="text-sm font-medium underline-offset-4 hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.recentReceipts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No receipts recorded yet.</p>
            ) : (
              overview.recentReceipts.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.residentName}</p>
                    <p className="text-xs text-muted-foreground">{row.method} · {formatCalendarDate(row.paymentDate)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-medium">{formatCurrency(row.amount)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent move-ins</CardTitle>
          <Link href={dest.residents} className="text-sm font-medium underline-offset-4 hover:underline">View residents</Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.recentMoveIns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No current residents in this view.</p>
          ) : (
            overview.recentMoveIns.map((row) => (
              <Link key={row.residentId} href={`/residents/${row.residentId}`} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 hover:underline">
                <span className="min-w-0 truncate text-sm font-medium">{row.fullName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{row.propertyName} · {formatCalendarDate(row.joiningDate)}</span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function rentCardProps(
  rent: import("@/lib/dashboard/overview").DashboardOverview["rent"],
  href: string
) {
  if (rent.kind === "no_eligible") {
    return <StatCard title="Outstanding Rent" value="No rent due yet" subtitle="No eligible residents this month" icon={IndianRupee} href={href} />;
  }
  if (rent.kind === "not_generated") {
    return <StatCard title="Outstanding Rent" value="Rent not generated" subtitle={`${rent.eligible} eligible resident(s)`} icon={AlertCircle} href={href} />;
  }
  if (rent.kind === "incomplete") {
    return (
      <StatCard
        title="Outstanding Rent"
        value="Rent generation incomplete"
        subtitle={`${rent.missing} resident${rent.missing === 1 ? "" : "s"} need rent generation`}
        icon={AlertCircle}
        tone="warning"
        href={href}
      />
    );
  }
  if (rent.outstanding > 0) {
    return <StatCardCurrency title="Outstanding Rent" value={rent.outstanding} subtitle="This month" icon={IndianRupee} tone="danger" href={href} />;
  }
  return <StatCardCurrency title="Outstanding Rent" value={0} subtitle="This month · fully paid" icon={IndianRupee} href={href} />;
}

function NeedsAttention({
  overview,
  dest,
}: {
  overview: import("@/lib/dashboard/overview").DashboardOverview;
  dest: ReturnType<typeof dashboardDestinations>;
}) {
  const items: Array<{ key: string; href: string; title: string; detail: string; icon: typeof AlertCircle }> = [];
  if (overview.overdueCount > 0) {
    items.push({
      key: "overdue",
      href: dest.overdue,
      title: "Overdue rent",
      detail: `${overview.overdueCount} charge${overview.overdueCount === 1 ? "" : "s"} · ${formatCurrency(overview.overdueAmount)} (all periods)`,
      icon: IndianRupee,
    });
  }
  if (overview.noticePeriodCount > 0) {
    items.push({
      key: "notice",
      href: dest.noticePeriod,
      title: "On notice period",
      detail: `${overview.noticePeriodCount} current resident${overview.noticePeriodCount === 1 ? "" : "s"}`,
      icon: Bell,
    });
  }
  if (overview.upcomingCheckouts.length > 0) {
    items.push({
      key: "checkout",
      href: dest.residents,
      title: "Upcoming checkouts",
      detail: `${overview.upcomingCheckouts.length} planned in the next 7 days`,
      icon: LogOut,
    });
  }
  if (overview.missingDocumentsCount > 0) {
    items.push({
      key: "docs",
      href: dest.residents,
      title: "No resident document uploaded",
      detail: `${overview.missingDocumentsCount} current resident${overview.missingDocumentsCount === 1 ? "" : "s"}`,
      icon: FileText,
    });
  }
  if (overview.missingContactCount > 0) {
    items.push({
      key: "contact",
      href: dest.residents,
      title: "Missing emergency/guardian contact",
      detail: `${overview.missingContactCount} current resident${overview.missingContactCount === 1 ? "" : "s"}`,
      icon: Contact,
    });
  }
  if (overview.occupancy.vacant > 0) {
    items.push({
      key: "vacant",
      href: dest.vacantBeds,
      title: "Vacant beds",
      detail: `${overview.occupancy.vacant} usable bed${overview.occupancy.vacant === 1 ? "" : "s"} without an assignment`,
      icon: BedDouble,
    });
  }

  return (
    <Card id="attention">
      <CardHeader>
        <CardTitle>Needs Attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everything looks up to date.</p>
        ) : (
          items.map((item) => (
            <Link key={item.key} href={item.href} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40">
              <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </Link>
          ))
        )}
        {overview.upcomingCheckouts.length > 0 ? (
          <ul className="space-y-2 border-t pt-3">
            {overview.upcomingCheckouts.map((row) => (
              <li key={row.residentId}>
                <Link href={`/residents/${row.residentId}`} className="text-sm hover:underline">
                  {row.fullName} · {row.propertyName} · {row.stayLabel} · {formatCalendarDate(row.plannedCheckoutDate)}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
