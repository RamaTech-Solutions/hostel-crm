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
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {user.profile.full_name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          {user.role === "owner"
            ? "Portfolio overview across all your properties"
            : "Overview of your assigned properties"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard title="Total Properties" value={stats.totalProperties} icon={Building2} />
        <StatCard title="Total Rooms" value={stats.totalRooms} icon={DoorOpen} />
        <StatCard title="Total Beds" value={stats.totalBeds} icon={BedDouble} />
        <StatCard
          title="Occupancy"
          value={`${stats.occupancyPercent}%`}
          subtitle={`${stats.occupiedBeds} occupied / ${stats.vacantBeds} vacant`}
          icon={TrendingUp}
        />
        <StatCard title="Active Residents" value={stats.activeResidents} icon={Users} />
        <StatCard title="Joining This Month" value={stats.joiningThisMonth} icon={UserPlus} />
        <StatCard title="Leaving This Month" value={stats.leavingThisMonth} icon={UserMinus} />
        <StatCardCurrency title="Rent Expected" value={stats.monthlyRentExpected} icon={IndianRupee} />
        <StatCardCurrency title="Rent Collected" value={stats.rentCollected} icon={Wallet} />
        <StatCardCurrency title="Outstanding Rent" value={stats.outstandingRent} icon={AlertCircle} />
        <StatCardCurrency title="Deposits Held" value={stats.securityDepositsHeld} icon={Wallet} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Occupancy by Property</CardTitle>
          </CardHeader>
          <CardContent>
            {occupancy.length > 0 ? (
              <OccupancyChart data={occupancy.map((o) => ({ name: o.name.split(" ").slice(-2).join(" "), occupancy: o.occupancy }))} />
            ) : (
              <p className="text-center text-muted-foreground py-12">No properties yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rent Collection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <RentCollectionChart collected={stats.rentCollected} pending={stats.outstandingRent} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2" id="alerts">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending alerts</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <AlertCircle className={`h-5 w-5 shrink-0 ${
                    n.severity === "critical" ? "text-destructive" :
                    n.severity === "warning" ? "text-warning" : "text-primary"
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                  <Badge variant={n.severity === "critical" ? "destructive" : "warning"} className="ml-auto shrink-0">
                    {n.type.replace("_", " ")}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Link href="/activity" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity</p>
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
