import { redirect } from "next/navigation";
import { getAuthUser, isOwner } from "@/lib/auth/get-user";
import { getTeamMembers } from "@/lib/queries";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const team = isOwner(user) ? await getTeamMembers(user) : [];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Settings" }]} />
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-base">Your Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {user.profile.full_name}</div>
            <div><span className="text-muted-foreground">Email:</span> {user.profile.email}</div>
            <div><span className="text-muted-foreground">Role:</span> <Badge className="ml-1 capitalize">{user.role.replace("_", " ")}</Badge></div>
            <div><span className="text-muted-foreground">Organization:</span> {user.organization.name}</div>
          </CardContent>
        </Card>

        {isOwner(user) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Team Members</CardTitle></CardHeader>
            <CardContent>
              {team.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members</p>
              ) : (
                <div className="space-y-3">
                  {team.map((member) => (
                    <div key={member.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                      <Badge className="capitalize">{member.role.replace("_", " ")}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
