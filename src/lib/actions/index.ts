"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuthUser, canWrite, canAccessProperty } from "@/lib/auth/get-user";
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
    const floors = Array.from({ length: floorCount }, (_, i) => ({
      property_id: data.id,
      organization_id: user.organization.id,
      floor_number: i + 1,
      label: i === 0 ? "Ground Floor" : `Floor ${i + 1}`,
    }));
    await supabase.from("floors").insert(floors);
  }

  await logActivity(user.organization.id, user.id, "created", "property", data.id);
  revalidatePath("/properties");
  revalidatePath("/dashboard");
  return { data };
}

export async function updateProperty(propertyId: string, formData: FormData) {
  const user = await requireAuthUser();
  if (!canAccessProperty(user, propertyId) || !canWrite(user)) {
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
  const { error } = await supabase.from("properties").update(parsed.data).eq("id", propertyId);

  if (error) return { error: error.message };

  await logActivity(user.organization.id, user.id, "updated", "property", propertyId);
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/properties");
  return { success: true };
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

  if (error) return { error: toUserError(error.message) };

  const bedLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const beds = Array.from({ length: parsed.data.bed_capacity }, (_, i) => ({
    room_id: room.id,
    property_id: parsed.data.property_id,
    organization_id: user.organization.id,
    bed_label: bedLabels[i] ?? String(i + 1),
    status: "available" as const,
    monthly_rent: parsed.data.monthly_rent,
  }));

  await supabase.from("beds").insert(beds);
  await logActivity(user.organization.id, user.id, "created", "room", room.id);

  revalidatePath(`/properties/${parsed.data.property_id}`);
  return { data: room };
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
  const user = await requireAuthUser();
  if (user.role !== "owner") return { error: "Only owners can complete onboarding" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.organization.id);

  if (error) return { error: toUserError(error.message) };
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function completeOnboardingToResidents() {
  const user = await requireAuthUser();
  if (user.role !== "owner") return { error: "Only owners can complete onboarding" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.organization.id);

  if (error) return { error: toUserError(error.message) };
  revalidatePath("/dashboard");
  redirect("/residents/new");
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

  const floors = Array.from({ length: count }, (_, i) => ({
    property_id: propertyId,
    organization_id: user.organization.id,
    floor_number: i,
    label: i === 0 ? "Ground Floor" : `Floor ${i}`,
  }));

  const { data, error } = await supabase.from("floors").insert(floors).select();
  if (error) return { error: toUserError(error.message) };

  await supabase.from("properties").update({ floor_count: count }).eq("id", propertyId);
  revalidatePath("/onboarding");
  return { data };
}

export async function updateFloorLabel(floorId: string, label: string) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: "Unauthorized" };
  const trimmed = label.trim();
  if (!trimmed) return { error: "Floor name is required" };

  const supabase = await createClient();
  const { error } = await supabase.from("floors").update({ label: trimmed }).eq("id", floorId);
  if (error) return { error: toUserError(error.message) };
  revalidatePath("/onboarding");
  return { success: true };
}

export async function createFloor(formData: FormData) {
  const user = await requireAuthUser();
  if (!canWrite(user)) return { error: "Unauthorized" };

  const propertyId = String(formData.get("property_id") ?? "");
  const floorNumber = Number(formData.get("floor_number") ?? 1);
  const label = String(formData.get("label") ?? "").trim() || `Floor ${floorNumber}`;

  if (!propertyId || !canAccessProperty(user, propertyId)) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();
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
  revalidatePath(`/properties/${propertyId}`);
  return { data };
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
