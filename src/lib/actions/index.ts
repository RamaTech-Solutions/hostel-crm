"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUser, canWrite, canAccessProperty, isOwner } from "@/lib/auth/get-user";
import { logActivity } from "@/lib/queries";
import {
  propertySchema,
  roomSchema,
  paymentSchema,
  checkoutSchema,
  transferSchema,
} from "@/lib/validations/schemas";
import { maskIdNumber } from "@/lib/utils";
import { toUserError } from "@/lib/user-error";
import { decideFirstPropertyAction } from "@/lib/onboarding/first-property";
import { generateFloorRows, nextFloorNumber, defaultFloorLabel } from "@/lib/onboarding/floors";
import { planBedReconcile } from "@/lib/onboarding/beds";
import { nextOnboardingCompletedAt } from "@/lib/onboarding/completion";
import { planOperationalRoomCreate, evaluateRoomDelete, canDeleteFloor, canToggleBedAvailability, DUPLICATE_ROOM_ERROR, LAST_ACTIVE_PROPERTY_ERROR } from "@/lib/inventory/room-ops";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function createProperty(formData: FormData) {
  const user = await requireAuthUser();
  if (user.role !== "owner") return { error: "Only owners can create properties" };

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
  if (!canAccessProperty(user, propertyId) || !isOwner(user)) {
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
  if (!isOwner(user) || !canAccessProperty(user, propertyId)) return { error: "Unauthorized" };

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
  if (!isOwner(user) || !canAccessProperty(user, propertyId)) return { error: "Unauthorized" };

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
  if (!isOwner(user) || !canAccessProperty(user, propertyId)) return { error: "Unauthorized" };

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
  return { success: true };
}

export async function onboardResident(data: Record<string, unknown>) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: "Unauthorized" };

  const propertyId = data.property_id as string;
  const bedId = data.bed_id as string;
  const roomId = data.room_id as string;

  if (!canAccessProperty(user, propertyId)) return { error: "Unauthorized" };

  const supabase = await createClient();

  const { data: bed } = await supabase
    .from("beds")
    .select("status")
    .eq("id", bedId)
    .single();

  if (!bed || bed.status !== "available") {
    return { error: "This bed is no longer available. Please select another bed." };
  }

  const idNumber = data.id_number as string;
  const joiningDate =
    (data.joining_date as string) || new Date().toISOString().split("T")[0];

  const { data: resident, error: residentError } = await supabase
    .from("residents")
    .insert({
      organization_id: user.organization.id,
      property_id: propertyId,
      full_name: data.full_name as string,
      date_of_birth: (data.date_of_birth as string) || null,
      gender: (data.gender as string) || null,
      mobile: data.mobile as string,
      email: (data.email as string) || null,
      permanent_address: {
        address_line: data.address_line,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      },
      id_type: data.id_type as string,
      id_number_masked: maskIdNumber(idNumber),
      id_last_four: idNumber?.slice(-4) ?? null,
      photo_url: (data.photo_url as string) || null,
      company_college: (data.company_college as string) || null,
      employee_student_id: (data.employee_student_id as string) || null,
      work_address: (data.work_address as string) || null,
      joining_date: joiningDate,
      planned_checkout_date: (data.planned_checkout_date as string) || null,
      monthly_rent: Number(data.monthly_rent) || 0,
      security_deposit_amount: Number(data.security_deposit_amount) || 0,
      agreement_status: "active",
      status: "active",
      remarks: (data.remarks as string) || null,
    })
    .select()
    .single();

  if (residentError) return { error: residentError.message };

  await supabase.from("resident_contacts").insert([
    {
      resident_id: resident.id,
      organization_id: user.organization.id,
      contact_type: "guardian",
      name: data.guardian_name as string,
      relation: data.guardian_relation as string,
      phone: data.guardian_phone as string,
    },
  ]);

  const { data: assignment, error: assignError } = await supabase
    .from("bed_assignments")
    .insert({
      resident_id: resident.id,
      bed_id: bedId,
      room_id: roomId,
      property_id: propertyId,
      organization_id: user.organization.id,
      assigned_by: user.id,
      start_date: joiningDate,
      is_active: true,
    })
    .select()
    .single();

  if (assignError) {
    await supabase.from("residents").delete().eq("id", resident.id);
    return { error: "Failed to assign bed. It may have been taken by another user." };
  }

  await supabase
    .from("residents")
    .update({ current_bed_assignment_id: assignment.id })
    .eq("id", resident.id);

  await supabase.from("beds").update({ status: "occupied" }).eq("id", bedId);

  if (Number(data.security_deposit_amount) > 0) {
    await supabase.from("security_deposits").insert({
      resident_id: resident.id,
      organization_id: user.organization.id,
      amount_held: Number(data.security_deposit_amount),
      status: "held",
    });
  }

  await logActivity(user.organization.id, user.id, "created", "resident", resident.id);
  await logActivity(user.organization.id, user.id, "assigned", "bed_assignment", assignment.id, {
    bed_id: bedId,
  });

  revalidatePath("/residents");
  revalidatePath("/dashboard");
  revalidatePath(`/properties/${propertyId}`);
  return { data: resident };
}

export async function recordPayment(formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: "Unauthorized" };

  const parsed = paymentSchema.safeParse({
    resident_id: formData.get("resident_id"),
    property_id: formData.get("property_id"),
    amount: formData.get("amount"),
    payment_date: formData.get("payment_date"),
    payment_type: formData.get("payment_type"),
    payment_method: formData.get("payment_method"),
    transaction_reference: formData.get("transaction_reference") || undefined,
    rent_month: formData.get("rent_month") || undefined,
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!canAccessProperty(user, parsed.data.property_id)) return { error: "Unauthorized" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .insert({
      ...parsed.data,
      organization_id: user.organization.id,
      recorded_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(user.organization.id, user.id, "payment_recorded", "payment", data.id);
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  revalidatePath(`/residents/${parsed.data.resident_id}`);
  return { data };
}

export async function transferResident(residentId: string, formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: "Unauthorized" };

  const parsed = transferSchema.safeParse({
    property_id: formData.get("property_id"),
    room_id: formData.get("room_id"),
    bed_id: formData.get("bed_id"),
    transfer_date: formData.get("transfer_date"),
    reason: formData.get("reason") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!canAccessProperty(user, parsed.data.property_id)) return { error: "Unauthorized" };

  const supabase = await createClient();

  const { data: newBed } = await supabase
    .from("beds")
    .select("status")
    .eq("id", parsed.data.bed_id)
    .single();

  if (!newBed || newBed.status !== "available") {
    return { error: "Selected bed is not available" };
  }

  const { data: currentAssignment } = await supabase
    .from("bed_assignments")
    .select("*")
    .eq("resident_id", residentId)
    .eq("is_active", true)
    .single();

  if (!currentAssignment) return { error: "No active bed assignment found" };

  await supabase
    .from("bed_assignments")
    .update({ is_active: false, end_date: parsed.data.transfer_date })
    .eq("id", currentAssignment.id);

  await supabase
    .from("beds")
    .update({ status: "available" })
    .eq("id", currentAssignment.bed_id);

  const { data: newAssignment, error } = await supabase
    .from("bed_assignments")
    .insert({
      resident_id: residentId,
      bed_id: parsed.data.bed_id,
      room_id: parsed.data.room_id,
      property_id: parsed.data.property_id,
      organization_id: user.organization.id,
      assigned_by: user.id,
      start_date: parsed.data.transfer_date,
      is_active: true,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase.from("beds").update({ status: "occupied" }).eq("id", parsed.data.bed_id);

  await supabase
    .from("residents")
    .update({
      property_id: parsed.data.property_id,
      current_bed_assignment_id: newAssignment.id,
    })
    .eq("id", residentId);

  await supabase.from("room_transfers").insert({
    resident_id: residentId,
    from_bed_assignment_id: currentAssignment.id,
    to_bed_assignment_id: newAssignment.id,
    organization_id: user.organization.id,
    transferred_by: user.id,
    transfer_date: parsed.data.transfer_date,
    reason: parsed.data.reason,
    notes: parsed.data.notes,
  });

  await logActivity(user.organization.id, user.id, "transferred", "resident", residentId, {
    from_bed: currentAssignment.bed_id,
    to_bed: parsed.data.bed_id,
  });

  revalidatePath(`/residents/${residentId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function checkoutResident(residentId: string, formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: "Unauthorized" };

  const parsed = checkoutSchema.safeParse({
    checkout_date: formData.get("checkout_date"),
    final_payment_amount: formData.get("final_payment_amount") || 0,
    deposit_refund: formData.get("deposit_refund") || 0,
    deposit_deductions: formData.get("deposit_deductions") || 0,
    remarks: formData.get("remarks") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { data: resident } = await supabase
    .from("residents")
    .select("*, bed_assignment:bed_assignments!fk_current_bed_assignment(*)")
    .eq("id", residentId)
    .single();

  if (!resident) return { error: "Resident not found" };
  if (!canAccessProperty(user, resident.property_id!)) return { error: "Unauthorized" };

  const assignment = resident.bed_assignment as { id: string; bed_id: string } | null;

  if (assignment) {
    await supabase
      .from("bed_assignments")
      .update({ is_active: false, end_date: parsed.data.checkout_date })
      .eq("id", assignment.id);
    await supabase.from("beds").update({ status: "available" }).eq("id", assignment.bed_id);
  }

  await supabase
    .from("residents")
    .update({
      status: "checked_out",
      planned_checkout_date: parsed.data.checkout_date,
      current_bed_assignment_id: null,
      remarks: parsed.data.remarks ?? resident.remarks,
    })
    .eq("id", residentId);

  if (parsed.data.final_payment_amount && parsed.data.final_payment_amount > 0) {
    await supabase.from("payments").insert({
      resident_id: residentId,
      property_id: resident.property_id!,
      organization_id: user.organization.id,
      recorded_by: user.id,
      amount: parsed.data.final_payment_amount,
      payment_date: parsed.data.checkout_date,
      payment_type: "rent",
      payment_method: "cash",
      status: "paid",
      notes: "Final payment at checkout",
    });
  }

  const { data: deposit } = await supabase
    .from("security_deposits")
    .select("*")
    .eq("resident_id", residentId)
    .maybeSingle();

  if (deposit) {
    await supabase
      .from("security_deposits")
      .update({
        amount_refunded: parsed.data.deposit_refund ?? 0,
        deductions: parsed.data.deposit_deductions ?? 0,
        refund_date: parsed.data.checkout_date,
        status: "refunded",
      })
      .eq("id", deposit.id);
  }

  await logActivity(user.organization.id, user.id, "checked_out", "resident", residentId);
  revalidatePath(`/residents/${residentId}`);
  revalidatePath("/residents");
  revalidatePath("/dashboard");
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
  if (user.role !== "owner") return { error: "Only owners can complete onboarding" };

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
  redirect("/signup");
}

export async function updateOnboardingWorkspace(formData: FormData) {
  const user = await requireAuthUser();
  if (user.role !== "owner") return { error: "Only owners can update this" };

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
  if (user.role !== "owner" || !canAccessProperty(user, propertyId)) {
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
  if (!isOwner(user)) return { error: "Unauthorized" };
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
  if (!isOwner(user)) return { error: "Unauthorized" };

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
  if (user.role !== "owner") return { error: "Only owners can save the first property" };

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
  if (user.role !== "owner" || !canAccessProperty(user, propertyId)) {
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
  if (user.role !== "owner") return { error: "Unauthorized" };

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
  if (!canWrite(user)) return { error: "Unauthorized" };

  const residentId = String(formData.get("residentId") ?? "");
  const documentType = String(formData.get("documentType") ?? "other");
  const file = formData.get("file");

  if (!residentId || !(file instanceof File) || file.size === 0) {
    return { error: "File and resident are required" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "File must be under 5MB" };
  }

  const supabase = await createClient();
  const { data: resident } = await supabase
    .from("residents")
    .select("id, property_id, organization_id")
    .eq("id", residentId)
    .single();

  if (
    !resident ||
    resident.organization_id !== user.organization.id ||
    !resident.property_id ||
    !canAccessProperty(user, resident.property_id)
  ) {
    return { error: "Unauthorized" };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${resident.organization_id}/${resident.property_id}/${resident.id}/${Date.now()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("resident-documents")
    .upload(storagePath, buffer, { contentType: file.type || "application/octet-stream" });

  if (uploadError) return { error: uploadError.message };

  const { data, error } = await supabase
    .from("resident_documents")
    .insert({
      resident_id: residentId,
      organization_id: user.organization.id,
      uploaded_by: user.id,
      document_type: documentType,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity(user.organization.id, user.id, "document_uploaded", "resident_document", data.id);
  revalidatePath(`/residents/${residentId}`);
  return { data };
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
  revalidatePath("/dashboard");
}
