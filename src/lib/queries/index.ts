import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  AuthUser,
  DashboardStats,
  PropertyStats,
  ActivityLog,
  Notification,
  Property,
  Resident,
  Payment,
  Bed,
  Room,
  Floor,
  ResidentContact,
  ResidentDocument,
} from "@/types/database";

export type ResidentDetail = Resident & {
  property?: Property | null;
  contacts?: ResidentContact[];
  bed_assignment?: BedAssignmentWithRelations | null;
};

type BedAssignmentWithRelations = {
  id: string;
  bed?: Bed;
  room?: Room;
  property?: Property;
};

export type PaymentWithRelations = Payment & {
  resident?: { full_name: string };
  property?: { name: string };
};

export type BedWithRelations = Bed & {
  property?: { id?: string; name: string; status?: string };
  room?: { room_number: string };
  hasActiveAssignment?: boolean;
};

export type RoomWithBeds = Omit<Room, "beds"> & {
  beds: (Bed & { assignment?: { resident?: { id: string; full_name: string; mobile: string; status: string } } | null })[];
};

import { startOfMonth, endOfMonth, format } from "date-fns";
import { summarizeOccupancy } from "@/lib/inventory/occupancy";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

async function occupancyBedsForProperties(supabase: ServerSupabase, propertyIds: string[]) {
  if (!propertyIds.length) {
    return { beds: [] as { id: string; property_id: string; status: string; hasActiveAssignment: boolean }[], summary: summarizeOccupancy([]) };
  }

  const [{ data: beds }, { data: assignments }] = await Promise.all([
    supabase.from("beds").select("id, status, property_id").in("property_id", propertyIds),
    supabase
      .from("bed_assignments")
      .select("bed_id")
      .in("property_id", propertyIds)
      .eq("is_active", true)
      .is("end_date", null),
  ]);

  const active = new Set((assignments ?? []).map((row) => row.bed_id));
  const occupancyBeds = (beds ?? []).map((bed) => ({
    id: bed.id,
    property_id: bed.property_id,
    status: bed.status,
    hasActiveAssignment: active.has(bed.id),
  }));
  return { beds: occupancyBeds, summary: summarizeOccupancy(occupancyBeds) };
}

async function activePropertyIds(supabase: ServerSupabase, user: AuthUser) {
  let query = supabase.from("properties").select("id").eq("status", "active");
  if (user.role !== "owner") query = query.in("id", user.assignedPropertyIds);
  const { data } = await query;
  return (data ?? []).map((row) => row.id);
}

export async function logActivity(
  organizationId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {}
) {
  const supabase = await createClient();
  await supabase.from("activity_logs").insert({
    organization_id: organizationId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

export async function getDashboardStats(user: AuthUser): Promise<DashboardStats> {
  const supabase = await createClient();
  const propertyFilter = await activePropertyIds(supabase, user);

  const { count: totalRooms } = propertyFilter.length
    ? await supabase.from("rooms").select("id", { count: "exact", head: true }).in("property_id", propertyFilter)
    : { count: 0 };

  const occupancy = await occupancyBedsForProperties(supabase, propertyFilter);
  const totalBeds = occupancy.summary.total;
  const occupiedBeds = occupancy.summary.occupied;
  const vacantBeds = occupancy.summary.vacant;

  let residentsQuery = supabase
    .from("residents")
    .select("id, status, monthly_rent, joining_date, planned_checkout_date, security_deposit_amount");
  if (propertyFilter.length) residentsQuery = residentsQuery.in("property_id", propertyFilter);
  else residentsQuery = residentsQuery.in("property_id", ["00000000-0000-0000-0000-000000000000"]);
  const { data: residents } = await residentsQuery;

  const activeResidents = residents?.filter((r) => r.status === "active" || r.status === "notice_period").length ?? 0;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const joiningThisMonth =
    residents?.filter((r) => {
      const d = new Date(r.joining_date);
      return d >= monthStart && d <= monthEnd;
    }).length ?? 0;

  const leavingThisMonth =
    residents?.filter((r) => {
      if (!r.planned_checkout_date) return false;
      const d = new Date(r.planned_checkout_date);
      return d >= monthStart && d <= monthEnd;
    }).length ?? 0;

  const monthlyRentExpected =
    residents
      ?.filter((r) => r.status === "active" || r.status === "notice_period")
      .reduce((sum, r) => sum + Number(r.monthly_rent), 0) ?? 0;

  const securityDepositsHeld =
    residents
      ?.filter((r) => r.status === "active" || r.status === "notice_period")
      .reduce((sum, r) => sum + Number(r.security_deposit_amount), 0) ?? 0;

  const rentMonth = format(now, "yyyy-MM-01");
  let paymentsQuery = supabase
    .from("payments")
    .select("amount, status")
    .eq("payment_type", "rent")
    .gte("rent_month", rentMonth)
    .lte("rent_month", rentMonth);
  if (propertyFilter.length) paymentsQuery = paymentsQuery.in("property_id", propertyFilter);
  else paymentsQuery = paymentsQuery.in("property_id", ["00000000-0000-0000-0000-000000000000"]);
  const { data: payments } = await paymentsQuery;

  const rentCollected =
    payments
      ?.filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  const outstandingRent = Math.max(0, monthlyRentExpected - rentCollected);

  return {
    totalProperties: propertyFilter.length,
    totalRooms: totalRooms ?? 0,
    totalBeds,
    occupiedBeds,
    vacantBeds,
    occupancyPercent: occupancy.summary.occupancyPercent,
    activeResidents,
    joiningThisMonth,
    leavingThisMonth,
    monthlyRentExpected,
    rentCollected,
    outstandingRent,
    securityDepositsHeld,
  };
}

export async function getPropertyStats(propertyId: string): Promise<PropertyStats> {
  const supabase = await createClient();

  const { count: totalRooms } = await supabase
    .from("rooms")
    .select("id", { count: "exact" })
    .eq("property_id", propertyId);

  const occupancy = await occupancyBedsForProperties(supabase, [propertyId]);
  const totalBeds = occupancy.summary.total;
  const occupiedBeds = occupancy.summary.occupied;
  const availableBeds = occupancy.summary.vacant;

  const { data: residents } = await supabase
    .from("residents")
    .select("monthly_rent, status")
    .eq("property_id", propertyId)
    .in("status", ["active", "notice_period"]);

  const monthlyExpectedRevenue = residents?.reduce((s, r) => s + Number(r.monthly_rent), 0) ?? 0;

  const rentMonth = format(new Date(), "yyyy-MM-01");
  const { data: payments } = await supabase
    .from("payments")
    .select("amount, status")
    .eq("property_id", propertyId)
    .eq("payment_type", "rent")
    .gte("rent_month", rentMonth);

  const collectedRent =
    payments
      ?.filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((s, p) => s + Number(p.amount), 0) ?? 0;

  return {
    totalRooms: totalRooms ?? 0,
    totalBeds,
    occupiedBeds,
    availableBeds,
    monthlyExpectedRevenue,
    collectedRent,
    pendingRent: Math.max(0, monthlyExpectedRevenue - collectedRent),
    occupancyPercent: occupancy.summary.occupancyPercent,
  };
}

export async function getOccupancyByProperty(user: AuthUser) {
  const supabase = await createClient();
  let query = supabase.from("properties").select("id, name").eq("status", "active");
  if (user.role !== "owner") query = query.in("id", user.assignedPropertyIds);
  const { data: properties } = await query;

  const results = [];
  for (const prop of properties ?? []) {
    const occupancy = await occupancyBedsForProperties(supabase, [prop.id]);
    results.push({
      name: prop.name,
      occupancy: occupancy.summary.occupancyPercent,
      occupied: occupancy.summary.occupied,
      total: occupancy.summary.total,
      vacant: occupancy.summary.vacant,
      unavailable: occupancy.summary.unavailable,
      capacity: occupancy.summary.capacity,
    });
  }
  return results;
}

export async function getRecentActivity(user: AuthUser, limit = 10): Promise<ActivityLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("*, user:profiles(full_name)")
    .eq("organization_id", user.organization.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ActivityLog[];
}

export async function getNotifications(user: AuthUser, limit = 10): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("organization_id", user.organization.id)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Notification[];
}

export async function getProperties(
  user: AuthUser,
  options?: { includeInactive?: boolean }
): Promise<Property[]> {
  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select("*, manager:profiles!properties_manager_id_fkey(full_name, email)")
    .order("name");
  if (user.role !== "owner") query = query.in("id", user.assignedPropertyIds);
  if (!options?.includeInactive) query = query.eq("status", "active");
  const { data } = await query;
  return (data ?? []) as Property[];
}

export async function getPropertyOccupancyMap(propertyIds: string[]) {
  const supabase = await createClient();
  const { beds } = await occupancyBedsForProperties(supabase, propertyIds);
  const byProperty = new Map<string, ReturnType<typeof summarizeOccupancy>>();
  for (const id of propertyIds) {
    byProperty.set(
      id,
      summarizeOccupancy(beds.filter((bed) => bed.property_id === id))
    );
  }
  return { byProperty };
}

export async function getProperty(propertyId: string): Promise<Property | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("*, manager:profiles!properties_manager_id_fkey(full_name, email)")
    .eq("id", propertyId)
    .single();
  return data as Property | null;
}

export async function getFloors(propertyId: string): Promise<Floor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("floors")
    .select("*")
    .eq("property_id", propertyId)
    .order("floor_number");
  return (data ?? []) as Floor[];
}

export async function getRoomsWithBeds(propertyId: string): Promise<RoomWithBeds[]> {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("rooms")
    .select("*, floor:floors(*), beds(*)")
    .eq("property_id", propertyId)
    .order("room_number");

  if (!rooms) return [];

  const enriched = await Promise.all(
    (rooms as Room[]).map(async (room) => {
      const bedsWithResidents = await Promise.all(
        ((room.beds ?? []) as Bed[]).map(async (bed) => {
          const { data: assignment } = await supabase
            .from("bed_assignments")
            .select("*, resident:residents(id, full_name, mobile, status)")
            .eq("bed_id", bed.id)
            .eq("is_active", true)
            .is("end_date", null)
            .maybeSingle();
          return { ...bed, assignment };
        })
      );
      return { ...room, beds: bedsWithResidents };
    })
  );
  return enriched as RoomWithBeds[];
}

export async function getResidents(user: AuthUser, filters?: {
  propertyId?: string;
  status?: string;
  search?: string;
}): Promise<Resident[]> {
  const supabase = await createClient();
  let query = supabase
    .from("residents")
    .select(`
      *,
      property:properties(id, name),
      bed_assignment:bed_assignments!fk_current_bed_assignment(
        id, bed:beds(bed_label), room:rooms(room_number)
      )
    `)
    .order("full_name");

  if (user.role !== "owner") {
    if (!user.assignedPropertyIds.length) return [];
    query = query.in("property_id", user.assignedPropertyIds);
  }
  if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("getResidents error:", error.message);
    // Fallback without nested bed join if embed fails
    let fallback = supabase
      .from("residents")
      .select(`*, property:properties(id, name)`)
      .order("full_name");
    if (user.role !== "owner") fallback = fallback.in("property_id", user.assignedPropertyIds);
    if (filters?.propertyId) fallback = fallback.eq("property_id", filters.propertyId);
    if (filters?.status) fallback = fallback.eq("status", filters.status);
    if (filters?.search) {
      fallback = fallback.or(
        `full_name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%`
      );
    }
    const { data: fallbackData, error: fallbackError } = await fallback;
    if (fallbackError) {
      console.error("getResidents fallback error:", fallbackError.message);
      return [];
    }
    return (fallbackData ?? []) as Resident[];
  }
  return (data ?? []) as Resident[];
}

export async function getResident(residentId: string): Promise<ResidentDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("residents")
    .select(`
      *,
      property:properties(*),
      contacts:resident_contacts(*),
      bed_assignment:bed_assignments!fk_current_bed_assignment(
        *, bed:beds(*), room:rooms(*)
      )
    `)
    .eq("id", residentId)
    .single();
  return data as ResidentDetail | null;
}

export async function getResidentPayments(residentId: string): Promise<Payment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("resident_id", residentId)
    .order("payment_date", { ascending: false });
  return (data ?? []) as Payment[];
}

export async function getResidentDocuments(residentId: string): Promise<ResidentDocument[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resident_documents")
    .select("*")
    .eq("resident_id", residentId)
    .order("created_at", { ascending: false });
  return (data ?? []) as ResidentDocument[];
}

export async function getResidentActivity(residentId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("*, user:profiles(full_name)")
    .eq("entity_id", residentId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAvailableBeds(propertyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("beds")
    .select("*, room:rooms(id, room_number, monthly_rent)")
    .eq("property_id", propertyId)
    .eq("status", "available")
    .order("bed_label");
  return data ?? [];
}

export async function globalSearch(user: AuthUser, query: string) {
  const supabase = await createClient();
  const term = `%${query}%`;

  let residentsQuery = supabase
    .from("residents")
    .select("id, full_name, mobile, property:properties(name)")
    .or(`full_name.ilike.${term},mobile.ilike.${term},id_number_masked.ilike.${term}`)
    .limit(10);
  if (user.role !== "owner") residentsQuery = residentsQuery.in("property_id", user.assignedPropertyIds);

  let roomsQuery = supabase
    .from("rooms")
    .select("id, room_number, property:properties(id, name)")
    .ilike("room_number", term)
    .limit(10);
  if (user.role !== "owner") roomsQuery = roomsQuery.in("property_id", user.assignedPropertyIds);

  const [residents, rooms] = await Promise.all([residentsQuery, roomsQuery]);
  return {
    residents: (residents.data ?? []) as unknown as { id: string; full_name: string; mobile: string; property?: { name: string } }[],
    rooms: (rooms.data ?? []) as unknown as { id: string; room_number: string; property?: { id: string; name: string } }[],
  };
}

export async function getAllBeds(user: AuthUser, propertyId?: string): Promise<BedWithRelations[]> {
  const supabase = await createClient();
  const ids = await activePropertyIds(supabase, user);
  const scoped = propertyId && ids.includes(propertyId) ? [propertyId] : ids;
  if (!scoped.length) return [];

  const { data } = await supabase
    .from("beds")
    .select("*, room:rooms(room_number), property:properties(id, name, status)")
    .in("property_id", scoped)
    .order("status");

  const { beds: occupancyBeds } = await occupancyBedsForProperties(supabase, scoped);
  const active = new Set(occupancyBeds.filter((bed) => bed.hasActiveAssignment).map((bed) => bed.id));
  return ((data ?? []) as BedWithRelations[]).map((bed) => ({
    ...bed,
    hasActiveAssignment: active.has(bed.id),
  }));
}

export async function getPayments(user: AuthUser, filters?: { propertyId?: string; status?: string }): Promise<PaymentWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("payments")
    .select("*, resident:residents(full_name), property:properties(name)")
    .order("payment_date", { ascending: false });
  if (user.role !== "owner") query = query.in("property_id", user.assignedPropertyIds);
  if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters?.status) query = query.eq("status", filters.status);
  const { data } = await query;
  return (data ?? []) as PaymentWithRelations[];
}

export async function getActivityLogs(user: AuthUser, limit = 50): Promise<ActivityLog[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity_logs")
    .select("*, user:profiles(full_name)")
    .eq("organization_id", user.organization.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ActivityLog[];
}

export async function getTeamMembers(user: AuthUser) {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", user.organization.id);

  const { data: roles } = await supabase
    .from("user_roles")
    .select("*")
    .eq("organization_id", user.organization.id);

  const { data: assignments } = await supabase
    .from("property_user_assignments")
    .select("*, property:properties(name)")
    .eq("organization_id", user.organization.id);

  return (profiles ?? []).map((p) => ({
    ...p,
    role: roles?.find((r) => r.user_id === p.id)?.role ?? "viewer",
    properties: assignments?.filter((a) => a.user_id === p.id) ?? [],
  }));
}
