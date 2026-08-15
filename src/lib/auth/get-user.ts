import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuthUser, UserRole } from "@/types/database";

export type TenantGate =
  | { status: "anonymous" }
  | { status: "needs_bootstrap"; userId: string }
  | { status: "needs_onboarding"; userId: string }
  | { status: "ready"; userId: string };

export async function getTenantGate(): Promise<TenantGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "anonymous" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { status: "needs_bootstrap", userId: user.id };

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .maybeSingle();

  if (!organization) return { status: "needs_bootstrap", userId: user.id };

  const { data: roleRecord } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = roleRecord?.role;
  if (role === "property_admin" || role === "viewer") {
    return { status: "ready", userId: user.id };
  }

  if (organization.is_demo || organization.onboarding_completed_at || organization.slug === "urbanstay-pg") {
    return { status: "ready", userId: user.id };
  }

  return { status: "needs_onboarding", userId: user.id };
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const { data: roleRecord } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .single();

  if (!organization) return null;

  let assignedPropertyIds: string[] = [];
  if (roleRecord?.role === "property_admin" || roleRecord?.role === "viewer") {
    const { data: assignments } = await supabase
      .from("property_user_assignments")
      .select("property_id")
      .eq("user_id", user.id);
    assignedPropertyIds = assignments?.map((a) => a.property_id) ?? [];
  }

  return {
    id: user.id,
    email: user.email ?? profile.email,
    profile,
    role: (roleRecord?.role ?? "viewer") as UserRole,
    organization,
    assignedPropertyIds,
  };
}

export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export { canWrite, isOwner, canAccessProperty, canAccessResidentRecord } from "@/lib/auth/permissions";
