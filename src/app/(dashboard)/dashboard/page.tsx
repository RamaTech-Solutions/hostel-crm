import { getAuthUser } from "@/lib/auth/get-user";
import { redirect } from "next/navigation";
import {
  getDashboardStats,
  getOccupancyByProperty,
  getRecentActivity,
  getNotifications,
} from "@/lib/queries";
import { StatCard, StatCardCurrency } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OccupancyChart, RentCollectionChart } from "@/features/dashboard/charts";
import { formatDate } from "@/lib/utils";
import {
  Building2,
  DoorOpen,
  BedDouble,
  Users,
  UserPlus,
  UserMinus,
  IndianRupee,
  Wallet,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { FirstRunChecklist } from "@/features/dashboard/first-run-checklist";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const [stats, occupancy, activity, notifications] = await Promise.all([
    getDashboardStats(user),
    getOccupancyByProperty(user),
    getRecentActivity(user),
    getNotifications(user),
  ]);

  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-semibold leading-10 tracking-tight">
          {greeting}, {user.profile.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm leading-[22px] text-muted-foreground">
          {user.role === "owner"
            ? "What's happening across your properties"
            : "Overview of your assigned properties"}
        </p>
      </div>

      {user.role === "owner" && stats.activeResidents === 0 && stats.totalProperties > 0 && (
        <FirstRunChecklist stats={stats} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Properties" value={stats.totalProperties} icon={Building2} />
        <StatCard
          title="Occupancy"
          value={`${stats.occupancyPercent}%`}
          subtitle={`${stats.occupiedBeds} occupied / ${stats.vacantBeds} vacant`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard title="Residents" value={stats.activeResidents} icon={Users} />
        <StatCardCurrency
          title="Pending Rent"
          value={stats.outstandingRent}
          icon={AlertCircle}
          tone={stats.outstandingRent > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Rooms" value={stats.totalRooms} icon={DoorOpen} compact />
        <StatCard title="Beds" value={stats.totalBeds} icon={BedDouble} compact />
        <StatCard title="Joining this month" value={stats.joiningThisMonth} icon={UserPlus} compact />
        <StatCard title="Leaving this month" value={stats.leavingThisMonth} icon={UserMinus} compact />
        <StatCardCurrency title="Deposits held" value={stats.securityDepositsHeld} icon={Wallet} compact />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCardCurrency title="Rent expected" value={stats.monthlyRentExpected} icon={IndianRupee} compact />
        <StatCardCurrency title="Rent collected" value={stats.rentCollected} icon={Wallet} compact tone="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Occupancy by Property</CardTitle>
          </CardHeader>
          <CardContent>
            {occupancy.length > 0 ? (
              <OccupancyChart data={occupancy.map((o) => ({ name: o.name.split(" ").slice(-2).join(" "), occupancy: o.occupancy }))} />
            ) : (
              <EmptyState
                title="No properties yet"
                description="Add a property to see occupancy across your portfolio."
                action={
                  user.role === "owner" ? (
                    <Button asChild><Link href="/properties/new">Add Property</Link></Button>
                  ) : null
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rent Collection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <RentCollectionChart collected={stats.rentCollected} pending={stats.outstandingRent} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2" id="alerts">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <AlertCircle
                    className={`h-5 w-5 shrink-0 ${
                      n.severity === "critical"
                        ? "text-destructive"
                        : n.severity === "warning"
                          ? "text-warning"
                          : "text-info"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                  <Badge variant={n.severity === "critical" ? "destructive" : n.severity === "warning" ? "warning" : "info"} className="shrink-0">
                    {n.type.replace("_", " ")}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/activity" className="text-sm font-medium underline-offset-4 hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            ) : (
              activity.map((log) => (
                <div key={log.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm">
                      <span className="font-medium capitalize">{log.action.replace("_", " ")}</span>
                      {" "}{log.entity_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(log.user as { full_name?: string })?.full_name ?? "System"} · {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
