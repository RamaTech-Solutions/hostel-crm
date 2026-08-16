import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AuthUser, Organization, Profile, UserRole } from "@/types/database";

export type TenantGate =
  | { status: "anonymous" }
  | { status: "needs_bootstrap"; userId: string }
  | { status: "needs_onboarding"; userId: string }
  | { status: "ready"; userId: string };

const PROFILE_COLUMNS =
  "id, organization_id, full_name, email, phone, avatar_url, is_active, created_at, updated_at";
const ORGANIZATION_COLUMNS =
  "id, name, slug, logo_url, settings, rent_due_day, is_active, is_demo, onboarding_completed_at, created_at, updated_at";

type AuthContext =
  | { kind: "anonymous" }
  | { kind: "needs_bootstrap"; userId: string }
  | {
      kind: "loaded";
      user: AuthUser;
      dbRole: string | null;
    };

const loadAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { kind: "anonymous" };

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { kind: "needs_bootstrap", userId: user.id };

  const [{ data: roleRecord }, { data: organization }, { data: assignments }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("organizations")
      .select(ORGANIZATION_COLUMNS)
      .eq("id", profile.organization_id)
      .maybeSingle(),
    supabase.from("property_user_assignments").select("property_id").eq("user_id", user.id),
  ]);

  if (!organization) return { kind: "needs_bootstrap", userId: user.id };

  const dbRole = roleRecord?.role ?? null;
  const role = (dbRole ?? "viewer") as UserRole;
  const assignedPropertyIds =
    role === "property_admin" || role === "viewer"
      ? (assignments?.map((row) => row.property_id) ?? [])
      : [];

  return {
    kind: "loaded",
    dbRole,
    user: {
      id: user.id,
      email: user.email ?? profile.email,
      profile: profile as Profile,
      role,
      organization: organization as Organization,
      assignedPropertyIds,
    },
  };
});

function gateFromContext(ctx: AuthContext): TenantGate {
  if (ctx.kind === "anonymous") return { status: "anonymous" };
  if (ctx.kind === "needs_bootstrap") return { status: "needs_bootstrap", userId: ctx.userId };

  const { user, dbRole } = ctx;
  if (dbRole === "property_admin" || dbRole === "viewer") {
    return { status: "ready", userId: user.id };
  }
  if (user.organization.is_demo || user.organization.onboarding_completed_at || user.organization.slug === "urbanstay-pg") {
    return { status: "ready", userId: user.id };
  }
  return { status: "needs_onboarding", userId: user.id };
}

export const getTenantGate = cache(async (): Promise<TenantGate> => {
  return gateFromContext(await loadAuthContext());
});

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const ctx = await loadAuthContext();
  return ctx.kind === "loaded" ? ctx.user : null;
});

export async function requireAuthUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export {
  canWrite,
  isOwner,
  canOwn,
  canMutateTenant,
  canAccessProperty,
  canAccessResidentRecord,
  DEMO_READ_ONLY,
} from "@/lib/auth/permissions";
