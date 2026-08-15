import "server-only";
import { createClient } from "@/lib/supabase/server";
import { LIST_PAGE_SIZE, pageRange } from "@/lib/list-query";
import { sanitizeSearchTerm } from "@/lib/search";
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
  RentChargeBalance,
} from "@/types/database";

export type ResidentDetail = Resident & {
  property?: Property | null;
  contacts?: ResidentContact[];
  bed_assignment?: BedAssignmentWithRelations | null;
};

type BedAssignmentWithRelations = {
  id: string;
  bed_id?: string;
  room_id?: string;
  property_id?: string;
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
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

export async function occupancyBedsForProperties(supabase: ServerSupabase, propertyIds: string[]) {
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

export async function activePropertyIds(supabase: ServerSupabase, user: AuthUser) {
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

  const securityDepositsHeld =
    residents
      ?.filter((r) => r.status === "active" || r.status === "notice_period")
      .reduce((sum, r) => sum + Number(r.security_deposit_amount), 0) ?? 0;

  const rentMonth = format(now, "yyyy-MM-01");
  let chargesQuery = supabase
    .from("rent_charge_balances")
    .select("amount_due, allocated_paid, outstanding, voided_at, period_start")
    .eq("period_start", rentMonth)
    .is("voided_at", null);
  if (propertyFilter.length) chargesQuery = chargesQuery.in("property_id", propertyFilter);
  else chargesQuery = chargesQuery.in("property_id", ["00000000-0000-0000-0000-000000000000"]);
  const { data: charges } = await chargesQuery;
  const ledgerGenerated = (charges?.length ?? 0) > 0;
  const monthlyRentExpected = ledgerGenerated
    ? charges?.reduce((sum, c) => sum + Number(c.amount_due), 0) ?? 0
    : 0;
  const rentCollected = ledgerGenerated
    ? charges?.reduce((sum, c) => sum + Number(c.allocated_paid), 0) ?? 0
    : 0;
  const outstandingRent = ledgerGenerated
    ? charges?.reduce((sum, c) => sum + Number(c.outstanding), 0) ?? 0
    : 0;

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
    ledgerGenerated,
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

  const rentMonth = format(new Date(), "yyyy-MM-01");
  const { data: charges } = await supabase
    .from("rent_charge_balances")
    .select("amount_due, allocated_paid, outstanding, voided_at")
    .eq("property_id", propertyId)
    .eq("period_start", rentMonth)
    .is("voided_at", null);
  const ledgerGenerated = (charges?.length ?? 0) > 0;
  const monthlyExpectedRevenue = ledgerGenerated
    ? charges?.reduce((s, c) => s + Number(c.amount_due), 0) ?? 0
    : 0;
  const collectedRent = ledgerGenerated
    ? charges?.reduce((s, c) => s + Number(c.allocated_paid), 0) ?? 0
    : 0;
  const pendingRent = ledgerGenerated
    ? charges?.reduce((s, c) => s + Number(c.outstanding), 0) ?? 0
    : 0;

  return {
    totalRooms: totalRooms ?? 0,
    totalBeds,
    occupiedBeds,
    availableBeds,
    monthlyExpectedRevenue,
    collectedRent,
    pendingRent,
    occupancyPercent: occupancy.summary.occupancyPercent,
    ledgerGenerated,
  };
}

export async function getOccupancyByProperty(user: AuthUser) {
  const supabase = await createClient();
  let query = supabase.from("properties").select("id, name").eq("status", "active");
  if (user.role !== "owner") query = query.in("id", user.assignedPropertyIds);
  const { data: properties } = await query;
  const ids = (properties ?? []).map((p) => p.id);
  const occupancy = await occupancyBedsForProperties(supabase, ids);
  return (properties ?? []).map((prop) => {
    const summary = summarizeOccupancy(occupancy.beds.filter((bed) => bed.property_id === prop.id));
    return {
      name: prop.name,
      occupancy: summary.occupancyPercent,
      occupied: summary.occupied,
      total: summary.total,
      vacant: summary.vacant,
      unavailable: summary.unavailable,
      capacity: summary.capacity,
    };
  });
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

export async function getResidents(
  user: AuthUser,
  filters?: {
    propertyId?: string;
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }
): Promise<{ rows: Resident[]; total: number }> {
  if (user.role !== "owner" && !user.assignedPropertyIds.length) {
    return { rows: [], total: 0 };
  }

  const paginate = typeof filters?.page === "number";
  const pageSize = filters?.pageSize ?? LIST_PAGE_SIZE;
  const supabase = await createClient();
  let query = supabase
    .from("residents")
    .select(
      `
      *,
      property:properties(id, name),
      bed_assignment:bed_assignments!fk_current_bed_assignment(
        id, bed:beds(bed_label), room:rooms(room_number)
      )
    `,
      { count: "exact" }
    )
    .order("full_name");

  if (user.role !== "owner") query = query.in("property_id", user.assignedPropertyIds);
  if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters?.status === "staying") query = query.in("status", ["active", "notice_period"]);
  else if (filters?.status) query = query.eq("status", filters.status);
  const search = sanitizeSearchTerm(filters?.search);
  if (search) query = query.or(`full_name.ilike.%${search}%,mobile.ilike.%${search}%`);
  if (paginate) {
    const { from, to } = pageRange(filters!.page!, pageSize);
    query = query.range(from, to);
  }

  const { data, error, count } = await query;
  if (!error) {
    const rows = (data ?? []) as Resident[];
    return { rows, total: count ?? rows.length };
  }

  let fallback = supabase
    .from("residents")
    .select(`*, property:properties(id, name)`, { count: "exact" })
    .order("full_name");
  if (user.role !== "owner") fallback = fallback.in("property_id", user.assignedPropertyIds);
  if (filters?.propertyId) fallback = fallback.eq("property_id", filters.propertyId);
  if (filters?.status === "staying") fallback = fallback.in("status", ["active", "notice_period"]);
  else if (filters?.status) fallback = fallback.eq("status", filters.status);
  if (search) fallback = fallback.or(`full_name.ilike.%${search}%,mobile.ilike.%${search}%`);
  if (paginate) {
    const { from, to } = pageRange(filters!.page!, pageSize);
    fallback = fallback.range(from, to);
  }
  const { data: fallbackData, count: fallbackCount } = await fallback;
  const rows = (fallbackData ?? []) as Resident[];
  return { rows, total: fallbackCount ?? rows.length };
}

export async function getResident(residentId: string): Promise<ResidentDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("residents")
    .select(`
      *,
      property:properties(*),
      contacts:resident_contacts(*)
    `)
    .eq("id", residentId)
    .single();
  if (!data) return null;

  const { data: active } = await supabase
    .from("bed_assignments")
    .select("*, bed:beds(*), room:rooms(*), property:properties(*)")
    .eq("resident_id", residentId)
    .eq("is_active", true)
    .is("end_date", null)
    .maybeSingle();

  return { ...(data as ResidentDetail), bed_assignment: (active ?? null) as ResidentDetail["bed_assignment"] };
}

export async function getResidentStayHistory(residentId: string) {
  const supabase = await createClient();
  const [{ data: assignments }, { data: transfers }] = await Promise.all([
    supabase
      .from("bed_assignments")
      .select("id, start_date, end_date, is_active, bed:beds(bed_label), room:rooms(room_number), property:properties(name)")
      .eq("resident_id", residentId)
      .order("start_date"),
    supabase
      .from("room_transfers")
      .select("id, transfer_date, reason, from_bed_assignment_id, to_bed_assignment_id")
      .eq("resident_id", residentId)
      .order("transfer_date"),
  ]);
  return { assignments: assignments ?? [], transfers: transfers ?? [] };
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
  const { data: property } = await supabase.from("properties").select("status").eq("id", propertyId).maybeSingle();
  if (property?.status !== "active") return [];
  const [{ data: beds }, { data: assignments }] = await Promise.all([
    supabase.from("beds").select("*, room:rooms(id, room_number, monthly_rent)").eq("property_id", propertyId),
    supabase.from("bed_assignments").select("bed_id").eq("property_id", propertyId).eq("is_active", true).is("end_date", null),
  ]);
  const active = new Set((assignments ?? []).map((row) => row.bed_id));
  return (beds ?? []).filter((bed) => !active.has(bed.id) && bed.status !== "maintenance" && bed.status !== "reserved");
}

export async function globalSearch(user: AuthUser, query: string) {
  const supabase = await createClient();
  const search = sanitizeSearchTerm(query);
  if (!search) return { residents: [], rooms: [] };
  const term = `%${search}%`;

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

export async function getPayments(
  user: AuthUser,
  filters?: { propertyId?: string; status?: string; page?: number; pageSize?: number }
): Promise<{ rows: PaymentWithRelations[]; total: number }> {
  const paginate = typeof filters?.page === "number";
  const pageSize = filters?.pageSize ?? LIST_PAGE_SIZE;
  const supabase = await createClient();
  let query = supabase
    .from("payments")
    .select("*, resident:residents(full_name), property:properties(name)", { count: "exact" })
    .order("payment_date", { ascending: false });
  if (user.role !== "owner") query = query.in("property_id", user.assignedPropertyIds);
  if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (paginate) {
    const { from, to } = pageRange(filters!.page!, pageSize);
    query = query.range(from, to);
  }
  const { data, count } = await query;
  const rows = (data ?? []) as PaymentWithRelations[];
  return { rows, total: count ?? rows.length };
}

export async function getRentCharges(
  user: AuthUser,
  filters: { periodStart: string; propertyId?: string; status?: string; search?: string }
): Promise<RentChargeBalance[]> {
  const supabase = await createClient();
  let query = supabase
    .from("rent_charge_balances")
    .select("*, resident:residents(full_name, status), property:properties(name)")
    .eq("period_start", filters.periodStart)
    .is("voided_at", null)
    .order("due_date");
  if (user.role !== "owner") query = query.in("property_id", user.assignedPropertyIds);
  if (filters.propertyId) query = query.eq("property_id", filters.propertyId);
  if (filters.status && filters.status !== "all") query = query.eq("ledger_status", filters.status);
  const { data } = await query;
  let rows = (data ?? []) as RentChargeBalance[];
  const search = sanitizeSearchTerm(filters.search);
  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((row) => (row.resident as { full_name?: string } | undefined)?.full_name?.toLowerCase().includes(q));
  }
  return rows;
}

export async function getPeriodLedgerSummary(user: AuthUser, periodStart: string, propertyId?: string) {
  const charges = await getRentCharges(user, { periodStart, propertyId });
  const ledgerGenerated = charges.length > 0;
  const due = charges.reduce((s, c) => s + Number(c.amount_due), 0);
  const collected = charges.reduce((s, c) => s + Number(c.allocated_paid), 0);
  const outstanding = charges.reduce((s, c) => s + Number(c.outstanding), 0);

  const supabase = await createClient();
  let overdueQuery = supabase
    .from("rent_charge_balances")
    .select("outstanding")
    .eq("ledger_status", "overdue")
    .is("voided_at", null);
  if (user.role !== "owner") overdueQuery = overdueQuery.in("property_id", user.assignedPropertyIds);
  if (propertyId) overdueQuery = overdueQuery.eq("property_id", propertyId);
  const { data: overdueRows } = await overdueQuery;
  const overdue = (overdueRows ?? []).reduce((s, c) => s + Number(c.outstanding), 0);

  let legacyQuery = supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("payment_type", "rent")
    .is("rent_charge_id", null)
    .eq("rent_month", periodStart);
  if (user.role !== "owner") legacyQuery = legacyQuery.in("property_id", user.assignedPropertyIds);
  if (propertyId) legacyQuery = legacyQuery.eq("property_id", propertyId);
  const { count: legacyCount } = await legacyQuery;

  return {
    ledgerGenerated,
    due: ledgerGenerated ? due : 0,
    collected: ledgerGenerated ? collected : 0,
    outstanding: ledgerGenerated ? outstanding : 0,
    overdue,
    legacyReceiptCount: legacyCount ?? 0,
  };
}

export async function getResidentCharges(residentId: string): Promise<RentChargeBalance[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rent_charge_balances")
    .select("*")
    .eq("resident_id", residentId)
    .is("voided_at", null)
    .order("period_start");
  return (data ?? []) as RentChargeBalance[];
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
