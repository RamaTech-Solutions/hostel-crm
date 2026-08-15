import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AuthUser } from "@/types/database";
import { occupancyBedsForProperties, activePropertyIds } from "@/lib/queries";
import { assembleDashboardOverview, type DashboardOverview } from "@/lib/dashboard/overview";
import { monthStart } from "@/lib/finance/period";
import { canAccessProperty } from "@/lib/auth/permissions";

export type DashboardLoadResult =
  | { ok: false; reason: "unauthorized_property" }
  | { ok: true; overview: DashboardOverview };

export async function getDashboardOverview(user: AuthUser, propertyParam?: string | null): Promise<DashboardLoadResult> {
  const supabase = await createClient();
  const authorizedIds = await activePropertyIds(supabase, user);

  if (propertyParam) {
    if (!authorizedIds.includes(propertyParam) || !canAccessProperty(user, propertyParam)) {
      return { ok: false, reason: "unauthorized_property" };
    }
  }

  const scopeIds = propertyParam ? [propertyParam] : authorizedIds;

  const propertiesQuery = supabase.from("properties").select("id, name, status").eq("status", "active").in("id", authorizedIds.length ? authorizedIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: allAuthorizedProperties } = await propertiesQuery;
  const selectorProperties = (allAuthorizedProperties ?? [])
    .filter((p) => authorizedIds.includes(p.id))
    .map((p) => ({ id: p.id, name: p.name }));

  const scopedProperties = propertyParam
    ? selectorProperties.filter((p) => p.id === propertyParam)
    : selectorProperties;

  const propertyStatusById = Object.fromEntries((allAuthorizedProperties ?? []).map((p) => [p.id, p.status]));

  const emptyScope = !scopeIds.length;
  const ids = emptyScope ? [] : scopeIds;

  const { count: totalRooms } = ids.length
    ? await supabase.from("rooms").select("id", { count: "exact", head: true }).in("property_id", ids)
    : { count: 0 };

  const occupancy = await occupancyBedsForProperties(supabase, ids);

  let residentsQuery = supabase
    .from("residents")
    .select("id, status, monthly_rent, joining_date, planned_checkout_date, property_id, full_name, current_bed_assignment_id");
  if (ids.length) residentsQuery = residentsQuery.in("property_id", ids);
  else residentsQuery = residentsQuery.in("property_id", ["00000000-0000-0000-0000-000000000000"]);
  const { data: residents } = await residentsQuery;

  const periodStart = monthStart(new Date());
  let chargesQuery = supabase
    .from("rent_charge_balances")
    .select("resident_id, outstanding")
    .eq("period_start", periodStart)
    .is("voided_at", null);
  if (ids.length) chargesQuery = chargesQuery.in("property_id", ids);
  else chargesQuery = chargesQuery.in("property_id", ["00000000-0000-0000-0000-000000000000"]);
  const { data: charges } = await chargesQuery;

  let overdueQuery = supabase
    .from("rent_charge_balances")
    .select("id, outstanding")
    .eq("ledger_status", "overdue")
    .is("voided_at", null);
  if (ids.length) overdueQuery = overdueQuery.in("property_id", ids);
  else overdueQuery = overdueQuery.in("property_id", ["00000000-0000-0000-0000-000000000000"]);
  const { data: overdueRows } = await overdueQuery;

  const stayingIds = (residents ?? []).map((r) => r.id);
  const { data: documents } = stayingIds.length
    ? await supabase.from("resident_documents").select("resident_id, document_type").in("resident_id", stayingIds)
    : { data: [] as { resident_id: string; document_type: string }[] };
  const { data: contacts } = stayingIds.length
    ? await supabase.from("resident_contacts").select("resident_id, contact_type, name, phone").in("resident_id", stayingIds)
    : { data: [] as { resident_id: string; contact_type: string; name: string | null; phone: string | null }[] };

  let paymentsQuery = supabase
    .from("payments")
    .select("id, amount, payment_method, payment_date, payment_type, resident:residents(full_name)")
    .eq("payment_type", "rent")
    .order("payment_date", { ascending: false })
    .limit(5);
  if (ids.length) paymentsQuery = paymentsQuery.in("property_id", ids);
  else paymentsQuery = paymentsQuery.in("property_id", ["00000000-0000-0000-0000-000000000000"]);
  const { data: receipts } = await paymentsQuery;

  const assignmentIds = [...new Set((residents ?? []).map((r) => r.current_bed_assignment_id).filter(Boolean))] as string[];
  const { data: assignments } = assignmentIds.length
    ? await supabase
        .from("bed_assignments")
        .select("id, room:rooms(room_number), bed:beds(bed_label)")
        .in("id", assignmentIds)
    : { data: [] as Array<{ id: string; room?: { room_number: string } | null; bed?: { bed_label: string } | null }> };

  const stayByAssignment = Object.fromEntries(
    (assignments ?? []).map((row) => {
      const room = Array.isArray(row.room) ? row.room[0] : row.room;
      const bed = Array.isArray(row.bed) ? row.bed[0] : row.bed;
      return [
        row.id,
        room ? `Room ${room.room_number}${bed?.bed_label ? `-${bed.bed_label}` : ""}` : "—",
      ];
    })
  );

  const documentsByResident: Record<string, Array<{ document_type: string }>> = {};
  for (const doc of documents ?? []) {
    (documentsByResident[doc.resident_id] ??= []).push({ document_type: doc.document_type });
  }
  const contactsByResident: Record<string, Array<{ contact_type: string; name?: string | null; phone?: string | null }>> = {};
  for (const contact of contacts ?? []) {
    (contactsByResident[contact.resident_id] ??= []).push(contact);
  }

  const overview = assembleDashboardOverview({
    selectedPropertyId: propertyParam ?? null,
    selectorProperties,
    properties: scopedProperties,
    totalRooms: totalRooms ?? 0,
    occupancyBeds: occupancy.beds,
    residents: (residents ?? []).map((r) => ({
      ...r,
      monthly_rent: Number(r.monthly_rent),
      stayLabel: r.current_bed_assignment_id ? stayByAssignment[r.current_bed_assignment_id] : "—",
    })),
    propertyStatusById,
    periodStart,
    currentCharges: (charges ?? []).map((c) => ({ resident_id: c.resident_id, outstanding: Number(c.outstanding) })),
    overdue: {
      count: overdueRows?.length ?? 0,
      amount: (overdueRows ?? []).reduce((sum, row) => sum + Number(row.outstanding), 0),
    },
    documentsByResident,
    contactsByResident,
    recentReceipts: (receipts ?? []).map((row) => ({
      id: row.id,
      residentName: (Array.isArray(row.resident) ? row.resident[0] : row.resident)?.full_name ?? "—",
      amount: Number(row.amount),
      method: row.payment_method,
      paymentDate: String(row.payment_date).slice(0, 10),
    })),
  });

  return { ok: true, overview };
}
