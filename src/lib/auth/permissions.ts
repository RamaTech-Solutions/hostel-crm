import type { AuthUser } from "@/types/database";

export function canWrite(user: AuthUser): boolean {
  return user.role === "owner" || user.role === "property_admin";
}

export function isOwner(user: AuthUser): boolean {
  return user.role === "owner";
}

export function canAccessProperty(user: AuthUser, propertyId: string): boolean {
  if (user.role === "owner") return true;
  return user.assignedPropertyIds.includes(propertyId);
}

export function canAccessResidentRecord(
  user: AuthUser,
  resident: { organization_id: string; property_id: string | null }
): boolean {
  if (resident.organization_id !== user.organization.id) return false;
  if (!resident.property_id) return user.role === "owner";
  return canAccessProperty(user, resident.property_id);
}
