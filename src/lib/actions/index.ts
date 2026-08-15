"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUser, canWrite, canOwn, canAccessProperty, canAccessResidentRecord } from "@/lib/auth/get-user";
import { logActivity } from "@/lib/queries";
import {
  propertySchema,
  roomSchema,
  paymentSchema,
  checkoutSchema,
  transferSchema,
} from "@/lib/validations/schemas";
import { toUserError } from "@/lib/user-error";
import { getPublicSignupHref } from "@/lib/app-url";
import { identityForPersistence } from "@/lib/residents/identity";
import { residentCreateSchema, residentProfileEditSchema } from "@/lib/residents/validation";
import { mapLifecycleError, RESIDENT_ERRORS } from "@/lib/residents/errors";
import { validateCheckoutDate, validateTransferDate } from "@/lib/residents/dates";
import { decideFirstPropertyAction } from "@/lib/onboarding/first-property";
import { generateFloorRows, nextFloorNumber, defaultFloorLabel } from "@/lib/onboarding/floors";
import { planBedReconcile } from "@/lib/onboarding/beds";
import { nextOnboardingCompletedAt } from "@/lib/onboarding/completion";
import {
  DOCUMENT_ERRORS,
} from "@/lib/documents/errors";
import {
  documentStoragePath,
  isAllowedDocumentType,
  isUuid,
  sanitizeDisplayFileName,
  storagePathMatchesDocument,
  validateUploadFile,
} from "@/lib/documents/files";
import { isCurrentBillingMonth, monthStart } from "@/lib/finance/period";
import { FINANCE_ERRORS, mapFinanceError } from "@/lib/finance/errors";
import { planOperationalRoomCreate, evaluateRoomDelete, canDeleteFloor, canToggleBedAvailability, DUPLICATE_ROOM_ERROR, LAST_ACTIVE_PROPERTY_ERROR } from "@/lib/inventory/room-ops";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createProperty(formData: FormData) {
  const user = await requireAuthUser();
  if (!canOwn(user)) return { error: "Only owners can create properties" };

  const parsed = propertySchema.safeParse({
    name: formData.get("name"),
    internal_code: formData.get("internal_code") || undefined,
    address_line: formData.get("address_line"),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    contact_phone: formData.get("contact_phone") || undefined,
    status: formData.get("status") || "active",
    floor_count: formData.get("floor_count") || 1,
    notes: formData.get("notes") || undefined,
    manager_id: formData.get("manager_id") || null,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({ ...parsed.data, organization_id: user.organization.id })
    .select()
    .single();

  if (error) return { error: toUserError(error.message) };

  if (formData.get("defer_floors") !== "1") {
    const floorCount = parsed.data.floor_count;
    const floors = generateFloorRows(data.id, user.organization.id, floorCount);
    await supabase.from("floors").insert(floors);
  }

  await logActivity(user.organization.id, user.id, "created", "property", data.id);
  revalidatePath("/properties");
  revalidatePath("/dashboard");
  return { data };
}

export async function updateProperty(propertyId: string, formData: FormData) {
  const user = await requireAuthUser();
  if (!canAccessProperty(user, propertyId) || !canOwn(user)) {
    return { error: "Unauthorized" };
  }

  const parsed = propertySchema.safeParse({
    name: formData.get("name"),
    internal_code: formData.get("internal_code") || undefined,
    address_line: formData.get("address_line"),
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    contact_phone: formData.get("contact_phone") || undefined,
    status: formData.get("status"),
    floor_count: formData.get("floor_count"),
    notes: formData.get("notes") || undefined,
    manager_id: formData.get("manager_id") || null,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({
      name: parsed.data.name,
      internal_code: parsed.data.internal_code,
      address_line: parsed.data.address_line,
      city: parsed.data.city,
      state: parsed.data.state,
      pincode: parsed.data.pincode,
      contact_phone: parsed.data.contact_phone,
      floor_count: parsed.data.floor_count,
      notes: parsed.data.notes,
      manager_id: parsed.data.manager_id,
    })
    .eq("id", propertyId);

  if (error) return { error: toUserError(error.message) };

  await logActivity(user.organization.id, user.id, "updated", "property", propertyId);
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  return { success: true };
}

async function loadBedReconcileInputs(supabase: SupabaseClient, roomId: string) {
  const { data: beds } = await supabase.from("beds").select("id, bed_label, status").eq("room_id", roomId);
  const currentBeds = beds ?? [];
  return Promise.all(
    currentBeds.map(async (bed) => {
      const { count } = await supabase
        .from("bed_assignments")
        .select("id", { count: "exact", head: true })
        .eq("bed_id", bed.id);
      return { ...bed, historyCount: count ?? 0 };
    })
  );
}

async function applyBedReconcile(
  supabase: SupabaseClient,
  input: {
    roomId: string;
    propertyId: string;
    organizationId: string;
    desired: number;
    monthlyRent: number;
  }
) {
  const historyCounts = await loadBedReconcileInputs(supabase, input.roomId);
  const plan = planBedReconcile(historyCounts, input.desired);
  if (!plan.ok) return { error: plan.error };

  if (plan.toDeleteIds.length) {
    const { error } = await supabase.from("beds").delete().in("id", plan.toDeleteIds);
    if (error) return { error: "We couldn't update beds. Your previous setup is still safe." };
  }

  if (plan.toInsert.length) {
    const rows = plan.toInsert.map((bed_label) => ({
      room_id: input.roomId,
      property_id: input.propertyId,
      organization_id: input.organizationId,
      bed_label,
      status: "available" as const,
      monthly_rent: input.monthlyRent,
    }));
    const { error } = await supabase.from("beds").insert(rows);
    if (error && error.code !== "23505") {
      return { error: "We couldn't update beds. Your previous setup is still safe." };
    }
  }

  await supabase.from("rooms").update({ bed_capacity: input.desired }).eq("id", input.roomId);
  return { success: true as const };
}

export async function createRoom(formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: "Unauthorized" };

  const parsed = roomSchema.safeParse({
    property_id: formData.get("property_id"),
    floor_id: formData.get("floor_id") || null,
    room_number: formData.get("room_number"),
    room_type: formData.get("room_type"),
    bed_capacity: formData.get("bed_capacity"),
    monthly_rent: formData.get("monthly_rent"),
    gender_restriction: formData.get("gender_restriction"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!canAccessProperty(user, parsed.data.property_id)) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: room, error } = await supabase
    .from("rooms")
    .insert({ ...parsed.data, organization_id: user.organization.id })
    .select()
    .single();

  let roomId = room?.id as string | undefined;
  if (error) {
    if (error.code !== "23505") return { error: toUserError(error.message) };
    const { data: existing } = await supabase
      .from("rooms")
      .select("id, floor_id, bed_capacity, property_id")
      .eq("property_id", parsed.data.property_id)
      .eq("room_number", parsed.data.room_number)
      .maybeSingle();
    if (!existing || existing.property_id !== parsed.data.property_id) {
      return { error: DUPLICATE_ROOM_ERROR };
    }
    const beds = await loadBedReconcileInputs(supabase, existing.id);
    const planned = planOperationalRoomCreate(
      { floor_id: existing.floor_id ?? null, beds },
      { floor_id: parsed.data.floor_id ?? null, bed_capacity: parsed.data.bed_capacity }
    );
    if (planned.type === "conflict" || planned.type === "fail") {
      return { error: planned.error };
    }
    const applied = await applyBedReconcile(supabase, {
      roomId: existing.id,
      propertyId: parsed.data.property_id,
      organizationId: user.organization.id,
      desired: parsed.data.bed_capacity,
      monthlyRent: parsed.data.monthly_rent,
    });
    if (applied.error) return { error: applied.error };
    roomId = existing.id;
  } else if (roomId) {
    const applied = await applyBedReconcile(supabase, {
      roomId,
      propertyId: parsed.data.property_id,
      organizationId: user.organization.id,
      desired: parsed.data.bed_capacity,
      monthlyRent: parsed.data.monthly_rent,
    });
    if (applied.error) return { error: applied.error };
  }

  if (!roomId) return { error: "We couldn't create that room. Please try again." };

  await logActivity(user.organization.id, user.id, "created", "room", roomId);
  revalidatePath(`/properties/${parsed.data.property_id}`);
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  return { data: { id: roomId } };
}

export async function updateRoom(roomId: string, formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: "Unauthorized" };

  const parsed = roomSchema.safeParse({
    property_id: formData.get("property_id"),
    floor_id: formData.get("floor_id") || null,
    room_number: formData.get("room_number"),
    room_type: formData.get("room_type"),
    bed_capacity: formData.get("bed_capacity"),
    monthly_rent: formData.get("monthly_rent"),
    gender_restriction: formData.get("gender_restriction"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!canAccessProperty(user, parsed.data.property_id)) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("rooms")
    .select("id, property_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!existing || existing.property_id !== parsed.data.property_id) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("rooms")
    .update({
      floor_id: parsed.data.floor_id,
      room_number: parsed.data.room_number,
      room_type: parsed.data.room_type,
      bed_capacity: parsed.data.bed_capacity,
      monthly_rent: parsed.data.monthly_rent,
      gender_restriction: parsed.data.gender_restriction,
      notes: parsed.data.notes,
    })
    .eq("id", roomId);

  if (error) {
    if (error.code === "23505") return { error: DUPLICATE_ROOM_ERROR };
    return { error: toUserError(error.message) };
  }

  const applied = await applyBedReconcile(supabase, {
    roomId,
    propertyId: parsed.data.property_id,
    organizationId: user.organization.id,
    desired: parsed.data.bed_capacity,
    monthlyRent: parsed.data.monthly_rent,
  });
  if (applied.error) return { error: applied.error };

  await logActivity(user.organization.id, user.id, "updated", "room", roomId);
  revalidatePath(`/properties/${parsed.data.property_id}`);
  revalidatePath("/rooms");
  return { success: true };
}

export async function archiveProperty(propertyId: string) {
  const user = await requireAuthUser();
  if (!canOwn(user) || !canAccessProperty(user, propertyId)) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("id, status").eq("id", propertyId).maybeSingle();
  if (!property) return { error: "Property not found." };
  if (property.status !== "active") return { error: "This property is already archived." };

  const { count } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", user.organization.id)
    .eq("status", "active");
  if ((count ?? 0) <= 1) return { error: LAST_ACTIVE_PROPERTY_ERROR };

  const { error } = await supabase.from("properties").update({ status: "inactive" }).eq("id", propertyId);
  if (error) return { error: toUserError(error.message) };

  await logActivity(user.organization.id, user.id, "archived", "property", propertyId);
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/dashboard");
  revalidatePath("/rooms");
  return { success: true };
}

export async function reactivateProperty(propertyId: string) {
  const user = await requireAuthUser();
  if (!canOwn(user) || !canAccessProperty(user, propertyId)) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { error } = await supabase.from("properties").update({ status: "active" }).eq("id", propertyId);
  if (error) return { error: toUserError(error.message) };

  await logActivity(user.organization.id, user.id, "reactivated", "property", propertyId);
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/dashboard");
  revalidatePath("/rooms");
  return { success: true };
}

export async function deleteFloor(floorId: string, propertyId: string) {
  const user = await requireAuthUser();
  if (!canOwn(user) || !canAccessProperty(user, propertyId)) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { count } = await supabase
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("floor_id", floorId);
  if (!canDeleteFloor(count ?? 0)) {
    return { error: "Move or delete rooms on this floor before removing it." };
  }

  const { error } = await supabase.from("floors").delete().eq("id", floorId).eq("property_id", propertyId);
  if (error) return { error: toUserError(error.message) };

  const { count: floorCount } = await supabase
    .from("floors")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);
  await supabase.from("properties").update({ floor_count: floorCount ?? 0 }).eq("id", propertyId);

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteRoom(roomId: string) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: room } = await supabase.from("rooms").select("id, property_id").eq("id", roomId).maybeSingle();
  if (!room || !canAccessProperty(user, room.property_id)) return { error: "Unauthorized" };

  const beds = await loadBedReconcileInputs(supabase, roomId);
  const unsafeBedCount = beds.filter((bed) => bed.status !== "available" || bed.historyCount > 0).length;

  const { count: assignmentCount } = await supabase
    .from("bed_assignments")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);

  const assignmentIds = (
    await supabase.from("bed_assignments").select("id").eq("room_id", roomId)
  ).data?.map((row) => row.id) ?? [];

  let transferCount = 0;
  if (assignmentIds.length) {
    const [{ count: fromCount }, { count: toCount }] = await Promise.all([
      supabase.from("room_transfers").select("id", { count: "exact", head: true }).in("from_bed_assignment_id", assignmentIds),
      supabase.from("room_transfers").select("id", { count: "exact", head: true }).in("to_bed_assignment_id", assignmentIds),
    ]);
    transferCount = (fromCount ?? 0) + (toCount ?? 0);
  }

  const decision = evaluateRoomDelete({
    unsafeBedCount,
    assignmentCount: assignmentCount ?? 0,
    transferCount,
    otherDependencyCount: 0,
  });
  if (!decision.ok) return { error: decision.error };

  if (beds.length) {
    const { error: bedError } = await supabase.from("beds").delete().in("id", beds.map((bed) => bed.id));
    if (bedError) return { error: "We couldn't delete this room. Your previous setup is still safe." };
  }

  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) return { error: toUserError(error.message) };

  await logActivity(user.organization.id, user.id, "deleted", "room", roomId);
  revalidatePath(`/properties/${room.property_id}`);
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setBedAvailability(bedId: string, nextStatus: "available" | "maintenance") {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: bed } = await supabase.from("beds").select("id, property_id, status").eq("id", bedId).maybeSingle();
  if (!bed || !canAccessProperty(user, bed.property_id)) return { error: "Unauthorized" };

  const { count } = await supabase
    .from("bed_assignments")
    .select("id", { count: "exact", head: true })
    .eq("bed_id", bedId)
    .eq("is_active", true)
    .is("end_date", null);
  if (!canToggleBedAvailability((count ?? 0) > 0)) {
    return { error: "This bed has an active resident. Occupancy is managed from the resident record." };
  }

  const { error } = await supabase.from("beds").update({ status: nextStatus }).eq("id", bedId);
  if (error) return { error: toUserError(error.message) };

  revalidatePath(`/properties/${bed.property_id}`);
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function onboardResident(data: Record<string, unknown>) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: RESIDENT_ERRORS.unauthorized };

  const parsed = residentCreateSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const payload = parsed.data;
  if (!canAccessProperty(user, payload.property_id)) return { error: RESIDENT_ERRORS.unauthorized };

  const identity = identityForPersistence(payload.id_number);
  const supabase = await createClient();
  const { data: rpc, error } = await supabase.rpc("onboard_resident", {
    p_resident_id: payload.resident_id,
    p_property_id: payload.property_id,
    p_room_id: payload.room_id,
    p_bed_id: payload.bed_id,
    p_full_name: payload.full_name,
    p_mobile: payload.mobile,
    p_email: payload.email || null,
    p_gender: payload.gender || null,
    p_date_of_birth: payload.date_of_birth || null,
    p_permanent_address: {
      address_line: payload.address_line || "",
      city: payload.city || "",
      state: payload.state || "",
      pincode: payload.pincode || "",
    },
    p_id_type: payload.id_type || null,
    p_id_number_masked: identity.id_number_masked,
    p_id_last_four: identity.id_last_four,
    p_company_college: payload.company_college || null,
    p_employee_student_id: payload.employee_student_id || null,
    p_work_address: payload.work_address || null,
    p_joining_date: payload.joining_date,
    p_planned_checkout_date: payload.planned_checkout_date || null,
    p_monthly_rent: payload.monthly_rent,
    p_security_deposit_amount: payload.security_deposit_amount ?? 0,
    p_remarks: payload.remarks || null,
    p_guardian_name: payload.guardian_name || null,
    p_guardian_relation: payload.guardian_relation || null,
    p_guardian_phone: payload.guardian_phone || null,
    p_emergency_name: payload.emergency_name || null,
    p_emergency_phone: payload.emergency_phone || null,
  });

  if (error) return { error: mapLifecycleError(error.message, RESIDENT_ERRORS.createFailed) };
  const result = rpc as { ok?: boolean; error?: string; resident_id?: string } | null;
  if (!result?.ok) return { error: mapLifecycleError(result?.error, RESIDENT_ERRORS.createFailed) };

  await logActivity(user.organization.id, user.id, "created", "resident", result.resident_id ?? payload.resident_id);
  revalidatePath("/residents");
  revalidatePath("/dashboard");
  revalidatePath(`/properties/${payload.property_id}`);
  revalidatePath("/rooms");
  return { data: { id: result.resident_id ?? payload.resident_id } };
}

export async function updateResident(residentId: string, formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: RESIDENT_ERRORS.unauthorized };

  const parsed = residentProfileEditSchema.safeParse({
    full_name: formData.get("full_name"),
    mobile: formData.get("mobile"),
    email: formData.get("email") || "",
    gender: formData.get("gender") || "",
    date_of_birth: formData.get("date_of_birth") || "",
    address_line: formData.get("address_line") || "",
    city: formData.get("city") || "",
    state: formData.get("state") || "",
    pincode: formData.get("pincode") || "",
    guardian_name: formData.get("guardian_name") || "",
    guardian_relation: formData.get("guardian_relation") || "",
    guardian_phone: formData.get("guardian_phone") || "",
    emergency_name: formData.get("emergency_name") || "",
    emergency_phone: formData.get("emergency_phone") || "",
    company_college: formData.get("company_college") || "",
    employee_student_id: formData.get("employee_student_id") || "",
    work_address: formData.get("work_address") || "",
    id_type: formData.get("id_type") || "",
    id_number: formData.get("id_number") || "",
    planned_checkout_date: formData.get("planned_checkout_date") || "",
    monthly_rent: formData.get("monthly_rent"),
    security_deposit_amount: formData.get("security_deposit_amount") || 0,
    remarks: formData.get("remarks") || "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("residents").select("id, property_id, id_number_masked, id_last_four").eq("id", residentId).maybeSingle();
  if (!existing || (existing.property_id && !canAccessProperty(user, existing.property_id))) {
    return { error: RESIDENT_ERRORS.unauthorized };
  }

  const identity = parsed.data.id_number
    ? identityForPersistence(parsed.data.id_number)
    : { id_number_masked: existing.id_number_masked, id_last_four: existing.id_last_four };

  const { error } = await supabase
    .from("residents")
    .update({
      full_name: parsed.data.full_name,
      mobile: parsed.data.mobile,
      email: parsed.data.email || null,
      gender: parsed.data.gender || null,
      date_of_birth: parsed.data.date_of_birth || null,
      permanent_address: {
        address_line: parsed.data.address_line || "",
        city: parsed.data.city || "",
        state: parsed.data.state || "",
        pincode: parsed.data.pincode || "",
      },
      id_type: parsed.data.id_type || null,
      id_number_masked: identity.id_number_masked,
      id_last_four: identity.id_last_four,
      company_college: parsed.data.company_college || null,
      employee_student_id: parsed.data.employee_student_id || null,
      work_address: parsed.data.work_address || null,
      planned_checkout_date: parsed.data.planned_checkout_date || null,
      monthly_rent: parsed.data.monthly_rent,
      security_deposit_amount: parsed.data.security_deposit_amount ?? 0,
      remarks: parsed.data.remarks || null,
    })
    .eq("id", residentId);
  if (error) return { error: toUserError(error.message) };

  const contacts = [
    parsed.data.guardian_name && parsed.data.guardian_phone
      ? { type: "guardian", name: parsed.data.guardian_name, relation: parsed.data.guardian_relation, phone: parsed.data.guardian_phone }
      : null,
    parsed.data.emergency_name && parsed.data.emergency_phone
      ? { type: "emergency", name: parsed.data.emergency_name, relation: null, phone: parsed.data.emergency_phone }
      : null,
  ].filter(Boolean) as { type: string; name: string; relation: string | null; phone: string }[];

  for (const contact of contacts) {
    const { data: row } = await supabase
      .from("resident_contacts")
      .select("id")
      .eq("resident_id", residentId)
      .eq("contact_type", contact.type)
      .maybeSingle();
    if (row) {
      await supabase
        .from("resident_contacts")
        .update({ name: contact.name, relation: contact.relation, phone: contact.phone })
        .eq("id", row.id);
    } else {
      await supabase.from("resident_contacts").insert({
        resident_id: residentId,
        organization_id: user.organization.id,
        contact_type: contact.type,
        name: contact.name,
        relation: contact.relation,
        phone: contact.phone,
      });
    }
  }

  await logActivity(user.organization.id, user.id, "updated", "resident", residentId);
  revalidatePath(`/residents/${residentId}`);
  revalidatePath("/residents");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function recordPayment(formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: FINANCE_ERRORS.recordUnauthorized };

  const parsed = paymentSchema.safeParse({
    payment_id: formData.get("payment_id"),
    resident_id: formData.get("resident_id"),
    property_id: formData.get("property_id"),
    amount: formData.get("amount"),
    payment_date: formData.get("payment_date"),
    payment_type: formData.get("payment_type"),
    payment_method: formData.get("payment_method"),
    transaction_reference: formData.get("transaction_reference") || undefined,
    rent_charge_id: formData.get("rent_charge_id") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!canAccessProperty(user, parsed.data.property_id)) return { error: FINANCE_ERRORS.unauthorized };

  const chargeId = parsed.data.rent_charge_id || null;
  const supabase = await createClient();
  const { data: rpc, error } = await supabase.rpc("record_resident_payment", {
    p_payment_id: parsed.data.payment_id,
    p_resident_id: parsed.data.resident_id,
    p_property_id: parsed.data.property_id,
    p_amount: parsed.data.amount,
    p_payment_date: parsed.data.payment_date,
    p_payment_type: parsed.data.payment_type,
    p_payment_method: parsed.data.payment_method,
    p_transaction_reference: parsed.data.transaction_reference ?? null,
    p_rent_charge_id: parsed.data.payment_type === "rent" ? chargeId : null,
    p_notes: parsed.data.notes ?? null,
  });

  if (error) return { error: mapFinanceError(error.message, FINANCE_ERRORS.recordFailed) };
  const result = rpc as { ok?: boolean; error?: string; payment_id?: string } | null;
  if (!result?.ok) return { error: mapFinanceError(result?.error, FINANCE_ERRORS.recordFailed) };

  await logActivity(user.organization.id, user.id, "payment_recorded", "payment", result.payment_id ?? parsed.data.payment_id);
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath(`/residents/${parsed.data.resident_id}`);
  return { data: { id: result.payment_id ?? parsed.data.payment_id } };
}

export async function generateRentCharges(formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: FINANCE_ERRORS.generateUnauthorized };

  const periodStart = monthStart(String(formData.get("period_start") || new Date().toISOString().slice(0, 10)));
  if (!isCurrentBillingMonth(periodStart)) return { error: FINANCE_ERRORS.currentMonthOnly };

  const supabase = await createClient();
  const { data: rpc, error } = await supabase.rpc("generate_rent_charges", { p_period_start: periodStart });
  if (error) return { error: mapFinanceError(error.message, FINANCE_ERRORS.generateFailed) };
  const result = rpc as { ok?: boolean; error?: string; created_count?: number } | null;
  if (!result?.ok) return { error: mapFinanceError(result?.error, FINANCE_ERRORS.generateFailed) };

  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath("/residents");
  return { data: result };
}

export async function voidRentCharge(formData: FormData) {
  const user = await requireAuthUser();
  if (!canOwn(user)) return { error: FINANCE_ERRORS.voidOwner };
  const chargeId = String(formData.get("charge_id") || "");
  if (!chargeId) return { error: "Charge is required." };

  const supabase = await createClient();
  const { data: rpc, error } = await supabase.rpc("void_rent_charge", {
    p_charge_id: chargeId,
    p_reason: String(formData.get("reason") || ""),
  });
  if (error) return { error: mapFinanceError(error.message, FINANCE_ERRORS.voidWithPayments) };
  const result = rpc as { ok?: boolean; error?: string } | null;
  if (!result?.ok) return { error: mapFinanceError(result?.error, FINANCE_ERRORS.voidWithPayments) };
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  const residentId = String(formData.get("resident_id") || "");
  if (residentId) revalidatePath(`/residents/${residentId}`);
  return { success: true };
}

export async function updateOrgRentDueDay(formData: FormData) {
  const user = await requireAuthUser();
  if (!canOwn(user)) return { error: FINANCE_ERRORS.dueDayOwner };
  const dueDay = Number(formData.get("rent_due_day"));
  const supabase = await createClient();
  const { data: rpc, error } = await supabase.rpc("update_org_rent_due_day", { p_due_day: dueDay });
  if (error) return { error: mapFinanceError(error.message, FINANCE_ERRORS.dueDayRange) };
  const result = rpc as { ok?: boolean; error?: string } | null;
  if (!result?.ok) return { error: mapFinanceError(result?.error, FINANCE_ERRORS.dueDayRange) };
  revalidatePath("/settings");
  revalidatePath("/payments");
  return { success: true };
}

export async function transferResident(residentId: string, formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: RESIDENT_ERRORS.unauthorized };

  const parsed = transferSchema.safeParse({
    property_id: formData.get("property_id"),
    room_id: formData.get("room_id"),
    bed_id: formData.get("bed_id"),
    transfer_date: formData.get("transfer_date"),
    reason: formData.get("reason") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!canAccessProperty(user, parsed.data.property_id)) return { error: RESIDENT_ERRORS.unauthorized };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("bed_assignments")
    .select("start_date")
    .eq("resident_id", residentId)
    .eq("is_active", true)
    .is("end_date", null)
    .maybeSingle();
  if (current?.start_date) {
    const dateError = validateTransferDate(current.start_date, parsed.data.transfer_date);
    if (dateError) return { error: dateError };
  }

  const { data: rpc, error } = await supabase.rpc("transfer_resident", {
    p_resident_id: residentId,
    p_property_id: parsed.data.property_id,
    p_room_id: parsed.data.room_id,
    p_bed_id: parsed.data.bed_id,
    p_transfer_date: parsed.data.transfer_date,
    p_reason: parsed.data.reason ?? null,
    p_notes: parsed.data.notes ?? null,
  });
  if (error) return { error: mapLifecycleError(error.message, RESIDENT_ERRORS.transferFailed) };
  const result = rpc as { ok?: boolean; error?: string } | null;
  if (!result?.ok) return { error: mapLifecycleError(result?.error, RESIDENT_ERRORS.transferFailed) };

  await logActivity(user.organization.id, user.id, "transferred", "resident", residentId, {
    to_bed: parsed.data.bed_id,
  });
  revalidatePath(`/residents/${residentId}`);
  revalidatePath("/residents");
  revalidatePath("/dashboard");
  revalidatePath("/rooms");
  return { success: true };
}

export async function checkoutResident(residentId: string, formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: RESIDENT_ERRORS.unauthorized };

  const parsed = checkoutSchema.safeParse({
    checkout_date: formData.get("checkout_date"),
    final_payment_amount: formData.get("final_payment_amount") || 0,
    deposit_refund: formData.get("deposit_refund") || 0,
    deposit_deductions: formData.get("deposit_deductions") || 0,
    remarks: formData.get("remarks") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: resident } = await supabase.from("residents").select("id, property_id, status").eq("id", residentId).maybeSingle();
  if (!resident || (resident.property_id && !canAccessProperty(user, resident.property_id))) {
    return { error: RESIDENT_ERRORS.unauthorized };
  }

  const { data: current } = await supabase
    .from("bed_assignments")
    .select("start_date")
    .eq("resident_id", residentId)
    .eq("is_active", true)
    .is("end_date", null)
    .maybeSingle();
  if (current?.start_date) {
    const dateError = validateCheckoutDate(current.start_date, parsed.data.checkout_date);
    if (dateError) return { error: dateError };
  }

  const { data: rpc, error } = await supabase.rpc("checkout_resident", {
    p_resident_id: residentId,
    p_checkout_date: parsed.data.checkout_date,
    p_final_payment_amount: parsed.data.final_payment_amount ?? 0,
    p_deposit_refund: parsed.data.deposit_refund ?? 0,
    p_deposit_deductions: parsed.data.deposit_deductions ?? 0,
    p_remarks: parsed.data.remarks ?? null,
  });
  if (error) return { error: mapLifecycleError(error.message, RESIDENT_ERRORS.checkoutFailed) };
  const result = rpc as { ok?: boolean; error?: string } | null;
  if (!result?.ok) return { error: mapLifecycleError(result?.error, RESIDENT_ERRORS.checkoutFailed) };

  if (resident.status !== "checked_out") {
    await logActivity(user.organization.id, user.id, "checked_out", "resident", residentId);
  }
  revalidatePath(`/residents/${residentId}`);
  revalidatePath("/residents");
  revalidatePath("/dashboard");
  revalidatePath("/rooms");
  return { success: true };
}

export async function bootstrapOrganization(input?: {
  organizationName?: string;
  fullName?: string;
  phone?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const meta = user.user_metadata ?? {};
  const organizationName =
    input?.organizationName?.trim() ||
    String(meta.organization_name ?? meta.organizationName ?? "").trim();
  const fullName =
    input?.fullName?.trim() ||
    String(meta.full_name ?? meta.fullName ?? "").trim() ||
    user.email?.split("@")[0] ||
    "Owner";
  const phone = input?.phone?.trim() || String(meta.phone ?? "").trim() || null;

  if (!organizationName) {
    return { error: "Organization name is required" };
  }

  const { data, error } = await supabase.rpc("bootstrap_organization", {
    p_organization_name: organizationName,
    p_full_name: fullName,
    p_phone: phone,
  });

  if (error) return { error: toUserError(error.message) };
  return { organizationId: data as string };
}

export async function completeOnboarding() {
  const result = await markOnboardingComplete();
  if (result.error) return result;
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function completeOnboardingToResidents() {
  const result = await markOnboardingComplete();
  if (result.error) return result;
  revalidatePath("/dashboard");
  redirect("/residents/new");
}

async function markOnboardingComplete() {
  const user = await requireAuthUser();
  if (!canOwn(user)) return { error: "Only owners can complete onboarding" };

  const completedAt = nextOnboardingCompletedAt(
    user.organization.onboarding_completed_at,
    new Date().toISOString()
  );

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ onboarding_completed_at: completedAt })
    .eq("id", user.organization.id)
    .is("onboarding_completed_at", null);

  if (error) return { error: toUserError(error.message) };
  return { success: true as const };
}

export async function startOwnWorkspace() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(getPublicSignupHref());
}

export async function updateOnboardingWorkspace(formData: FormData) {
  const user = await requireAuthUser();
  if (!canOwn(user)) return { error: "Only owners can update this" };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const organizationName = String(formData.get("organization_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (fullName.length < 2) return { error: "Full name is required" };
  if (organizationName.length < 2) return { error: "Business name is required" };

  const supabase = await createClient();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", user.id);
  if (profileError) return { error: toUserError(profileError.message) };

  const { error: orgError } = await supabase
    .from("organizations")
    .update({ name: organizationName })
    .eq("id", user.organization.id);
  if (orgError) return { error: toUserError(orgError.message) };

  revalidatePath("/onboarding");
  return { success: true };
}

export async function setupOnboardingFloors(propertyId: string, floorCount: number) {
  const user = await requireAuthUser();
  if (!canOwn(user) || !canAccessProperty(user, propertyId)) {
    return { error: "Unauthorized" };
  }
  const count = Math.min(50, Math.max(1, Math.floor(floorCount)));
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("floors")
    .select("*")
    .eq("property_id", propertyId)
    .order("floor_number");

  if (existing?.length) {
    await supabase
      .from("properties")
      .update({ floor_count: existing.length })
      .eq("id", propertyId);
    return { data: existing };
  }

  const floors = generateFloorRows(propertyId, user.organization.id, count);

  const { data, error } = await supabase.from("floors").insert(floors).select();
  if (error) return { error: toUserError(error.message) };

  await supabase.from("properties").update({ floor_count: count }).eq("id", propertyId);
  revalidatePath("/onboarding");
  return { data };
}

export async function updateFloorLabel(floorId: string, label: string, propertyId?: string) {
  const user = await requireAuthUser();
  if (!canOwn(user)) return { error: "Unauthorized" };
  const trimmed = label.trim();
  if (!trimmed) return { error: "Floor name is required" };

  const supabase = await createClient();
  const { error } = await supabase.from("floors").update({ label: trimmed }).eq("id", floorId);
  if (error) return { error: toUserError(error.message) };
  revalidatePath("/onboarding");
  if (propertyId) revalidatePath(`/properties/${propertyId}`);
  return { success: true };
}

export async function createFloor(formData: FormData) {
  const user = await requireAuthUser();
  if (!canOwn(user)) return { error: "Unauthorized" };

  const propertyId = String(formData.get("property_id") ?? "");
  const requestedLabel = String(formData.get("label") ?? "").trim();

  if (!propertyId || !canAccessProperty(user, propertyId)) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("floors")
    .select("floor_number")
    .eq("property_id", propertyId);
  const floorNumber = nextFloorNumber((existing ?? []).map((floor) => floor.floor_number));
  const label = requestedLabel || defaultFloorLabel(floorNumber);

  const { data, error } = await supabase
    .from("floors")
    .insert({
      property_id: propertyId,
      organization_id: user.organization.id,
      floor_number: floorNumber,
      label,
    })
    .select()
    .single();

  if (error) return { error: toUserError(error.message) };
  await supabase.from("properties").update({ floor_count: (existing?.length ?? 0) + 1 }).eq("id", propertyId);
  revalidatePath(`/properties/${propertyId}`);
  return { data };
}

export async function saveOnboardingFirstProperty(formData: FormData) {
  const user = await requireAuthUser();
  if (!canOwn(user)) return { error: "Only owners can save the first property" };

  const expectedPropertyId = String(formData.get("property_id") ?? "").trim() || null;
  const supabase = await createClient();
  const { data: existing, error: listError } = await supabase
    .from("properties")
    .select("id")
    .eq("organization_id", user.organization.id)
    .order("created_at");

  if (listError) return { error: "We couldn't save your property. Please try again." };

  const decision = decideFirstPropertyAction(existing ?? [], expectedPropertyId);
  if (decision.type === "fail") return { error: decision.error };

  formData.set("status", formData.get("status") || "active");
  formData.set("floor_count", formData.get("floor_count") || "1");
  formData.set("defer_floors", "1");

  if (decision.type === "update") {
    const result = await updateProperty(decision.id, formData);
    if (result.error) return { error: result.error };
    const { data } = await supabase.from("properties").select("*").eq("id", decision.id).single();
    revalidatePath("/onboarding");
    return { data };
  }

  const result = await createProperty(formData);
  if (result.error || !result.data) {
    return { error: result.error ?? "We couldn't save your property. Please try again." };
  }
  revalidatePath("/onboarding");
  return { data: result.data };
}

export async function addOnboardingFloor(propertyId: string, label?: string) {
  const user = await requireAuthUser();
  if (!canOwn(user) || !canAccessProperty(user, propertyId)) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { data: existing, error: listError } = await supabase
    .from("floors")
    .select("*")
    .eq("property_id", propertyId)
    .order("floor_number");
  if (listError) return { error: "We couldn't add that floor. Please try again." };

  const floorNumber = nextFloorNumber((existing ?? []).map((floor) => floor.floor_number));
  const trimmed = label?.trim() || defaultFloorLabel(floorNumber);

  const { error } = await supabase.from("floors").insert({
    property_id: propertyId,
    organization_id: user.organization.id,
    floor_number: floorNumber,
    label: trimmed,
  });
  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
      const { data: again } = await supabase
        .from("floors")
        .select("*")
        .eq("property_id", propertyId)
        .order("floor_number");
      return { data: again ?? existing };
    }
    return { error: toUserError(error.message) };
  }

  const { data: floors } = await supabase
    .from("floors")
    .select("*")
    .eq("property_id", propertyId)
    .order("floor_number");
  await supabase.from("properties").update({ floor_count: floors?.length ?? 0 }).eq("id", propertyId);
  revalidatePath("/onboarding");
  return { data: floors ?? [] };
}

export async function getOnboardingSummary(propertyId: string) {
  const user = await requireAuthUser();
  if (!canAccessProperty(user, propertyId)) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("name").eq("id", propertyId).maybeSingle();
  const { count: floorCount } = await supabase.from("floors").select("id", { count: "exact", head: true }).eq("property_id", propertyId);
  const { count: roomCount } = await supabase.from("rooms").select("id", { count: "exact", head: true }).eq("property_id", propertyId);
  const { count: bedCount } = await supabase.from("beds").select("id", { count: "exact", head: true }).eq("property_id", propertyId);

  return {
    data: {
      propertyName: property?.name ?? "Your property",
      floorCount: floorCount ?? 0,
      roomCount: roomCount ?? 0,
      bedCount: bedCount ?? 0,
    },
  };
}

export async function saveOnboardingRoom(formData: FormData) {
  const user = await requireAuthUser();
  if (!canOwn(user)) return { error: "Unauthorized" };

  const parsed = roomSchema.safeParse({
    property_id: formData.get("property_id"),
    floor_id: formData.get("floor_id") || null,
    room_number: formData.get("room_number"),
    room_type: formData.get("room_type") || "other",
    bed_capacity: formData.get("bed_capacity"),
    monthly_rent: formData.get("monthly_rent") || 0,
    gender_restriction: formData.get("gender_restriction") || "none",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!canAccessProperty(user, parsed.data.property_id)) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data: existingRoom } = await supabase
    .from("rooms")
    .select("*")
    .eq("property_id", parsed.data.property_id)
    .eq("room_number", parsed.data.room_number)
    .maybeSingle();

  let roomId = existingRoom?.id as string | undefined;
  if (!roomId) {
    const { data: created, error } = await supabase
      .from("rooms")
      .insert({ ...parsed.data, organization_id: user.organization.id })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") {
        const { data: raced } = await supabase
          .from("rooms")
          .select("*")
          .eq("property_id", parsed.data.property_id)
          .eq("room_number", parsed.data.room_number)
          .maybeSingle();
        roomId = raced?.id;
        if (!roomId) return { error: "A room with this number already exists." };
      } else {
        return { error: "We couldn't create these rooms. Your previous setup is still safe." };
      }
    } else {
      roomId = created.id;
    }
  } else {
    const { error } = await supabase
      .from("rooms")
      .update({
        floor_id: parsed.data.floor_id,
        room_type: parsed.data.room_type,
        bed_capacity: parsed.data.bed_capacity,
        monthly_rent: parsed.data.monthly_rent,
      })
      .eq("id", roomId);
    if (error) return { error: "We couldn't create these rooms. Your previous setup is still safe." };
  }

  const { data: beds } = await supabase.from("beds").select("id, bed_label, status").eq("room_id", roomId);
  const currentBeds = beds ?? [];
  const historyCounts = await Promise.all(
    currentBeds.map(async (bed) => {
      const { count } = await supabase
        .from("bed_assignments")
        .select("id", { count: "exact", head: true })
        .eq("bed_id", bed.id);
      return { ...bed, historyCount: count ?? 0 };
    })
  );

  const plan = planBedReconcile(historyCounts, parsed.data.bed_capacity);
  if (!plan.ok) return { error: plan.error };

  if (plan.toDeleteIds.length) {
    const { error } = await supabase.from("beds").delete().in("id", plan.toDeleteIds);
    if (error) return { error: "We couldn't update beds. Your previous setup is still safe." };
  }

  if (plan.toInsert.length) {
    const rows = plan.toInsert.map((bed_label) => ({
      room_id: roomId,
      property_id: parsed.data.property_id,
      organization_id: user.organization.id,
      bed_label,
      status: "available" as const,
      monthly_rent: parsed.data.monthly_rent,
    }));
    const { error } = await supabase.from("beds").insert(rows);
    if (error && error.code !== "23505") {
      return { error: "We couldn't create these rooms. Your previous setup is still safe." };
    }
  }

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, room_number, bed_capacity, floor_id, beds(id)")
    .eq("property_id", parsed.data.property_id)
    .order("room_number");

  revalidatePath("/onboarding");
  return { data: rooms ?? [] };
}

export async function uploadDocument(formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: DOCUMENT_ERRORS.unauthorized };

  const residentId = String(formData.get("residentId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  const documentType = String(formData.get("documentType") ?? "other");
  const file = formData.get("file");

  if (!residentId || !documentId || !(file instanceof File)) {
    return { error: "File and resident are required." };
  }
  if (!isUuid(residentId) || !isUuid(documentId)) return { error: DOCUMENT_ERRORS.unauthorized };
  if (!isAllowedDocumentType(documentType)) return { error: DOCUMENT_ERRORS.unsupported };

  const checked = validateUploadFile(file);
  if (checked.error || !checked.ext || !checked.mime) return { error: checked.error ?? DOCUMENT_ERRORS.unsupported };

  const supabase = await createClient();
  const { data: resident } = await supabase
    .from("residents")
    .select("id, property_id, organization_id")
    .eq("id", residentId)
    .maybeSingle();

  if (!resident || !canAccessResidentRecord(user, resident)) {
    return { error: DOCUMENT_ERRORS.unauthorized };
  }

  const storagePath = documentStoragePath(resident.organization_id, resident.id, documentId, checked.ext);
  if (!storagePath) return { error: DOCUMENT_ERRORS.unauthorized };

  const { data: existing } = await supabase
    .from("resident_documents")
    .select("id, resident_id, storage_path, organization_id")
    .eq("id", documentId)
    .maybeSingle();

  if (existing) {
    if (
      existing.resident_id === resident.id &&
      existing.organization_id === resident.organization_id &&
      existing.storage_path === storagePath
    ) {
      return { data: { id: existing.id } };
    }
    return { error: DOCUMENT_ERRORS.conflictRetry };
  }

  const displayName = sanitizeDisplayFileName(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("resident-documents")
    .upload(storagePath, buffer, { contentType: checked.mime, upsert: false });

  const objectAlreadyThere =
    Boolean(uploadError?.message?.toLowerCase().includes("duplicate")) ||
    Boolean(uploadError?.message?.toLowerCase().includes("already exists"));

  if (uploadError && !objectAlreadyThere) {
    return { error: DOCUMENT_ERRORS.uploadFailed };
  }

  const { data, error } = await supabase
    .from("resident_documents")
    .insert({
      id: documentId,
      resident_id: residentId,
      organization_id: user.organization.id,
      uploaded_by: user.id,
      document_type: documentType,
      file_name: displayName,
      storage_path: storagePath,
      mime_type: checked.mime,
      file_size: file.size,
      is_verified: false,
    })
    .select("id")
    .single();

  if (error) {
    const { data: raced } = await supabase
      .from("resident_documents")
      .select("id, resident_id, storage_path")
      .eq("id", documentId)
      .maybeSingle();
    if (raced && raced.resident_id === resident.id && raced.storage_path === storagePath) {
      return { data: { id: raced.id } };
    }
    await supabase.storage.from("resident-documents").remove([storagePath]);
    return { error: DOCUMENT_ERRORS.uploadFailed };
  }

  await logActivity(user.organization.id, user.id, "document_uploaded", "resident_document", data.id);
  revalidatePath(`/residents/${residentId}`);
  revalidatePath("/dashboard");
  return { data };
}

export async function deleteDocument(formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: DOCUMENT_ERRORS.unauthorized };

  const documentId = String(formData.get("documentId") ?? "");
  const residentId = String(formData.get("residentId") ?? "");
  if (!documentId) return { error: DOCUMENT_ERRORS.missing };

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("resident_documents")
    .select("id, resident_id, organization_id, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc || doc.organization_id !== user.organization.id) {
    return { error: DOCUMENT_ERRORS.unauthorized };
  }
  if (residentId && doc.resident_id !== residentId) return { error: DOCUMENT_ERRORS.unauthorized };

  const { data: resident } = await supabase
    .from("residents")
    .select("id, property_id, organization_id")
    .eq("id", doc.resident_id)
    .maybeSingle();
  if (!resident || !canAccessResidentRecord(user, resident)) {
    return { error: DOCUMENT_ERRORS.unauthorized };
  }
  if (
    !storagePathMatchesDocument({
      storagePath: doc.storage_path,
      organizationId: doc.organization_id,
      residentId: doc.resident_id,
      documentId: doc.id,
    })
  ) {
    return { error: DOCUMENT_ERRORS.missing };
  }

  const { error: storageError } = await supabase.storage.from("resident-documents").remove([doc.storage_path]);
  const storageMissing =
    !storageError ||
    storageError.message.toLowerCase().includes("not found") ||
    String((storageError as { statusCode?: string }).statusCode) === "404";
  if (!storageMissing) {
    return { error: DOCUMENT_ERRORS.deleteFailed };
  }

  const { error: deleteError } = await supabase.from("resident_documents").delete().eq("id", doc.id);
  if (deleteError) {
    const retry = await supabase.from("resident_documents").delete().eq("id", doc.id);
    if (retry.error) {
      console.error("resident document metadata cleanup failed");
      return { error: DOCUMENT_ERRORS.cleanupFailed };
    }
  }

  await logActivity(user.organization.id, user.id, "deleted", "resident_document", doc.id);
  revalidatePath(`/residents/${doc.resident_id}`);
  revalidatePath("/dashboard");
  return { success: true };
}
