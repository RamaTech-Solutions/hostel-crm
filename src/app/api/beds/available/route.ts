import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, canAccessProperty } from "@/lib/auth/get-user";
import { classifyBed } from "@/lib/inventory/occupancy";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");
  if (!propertyId || !canAccessProperty(user, propertyId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: property } = await supabase.from("properties").select("id, status").eq("id", propertyId).maybeSingle();
  if (!property || property.status !== "active") {
    return NextResponse.json({ beds: [] });
  }
  const [{ data: beds }, { data: assignments }] = await Promise.all([
    supabase
      .from("beds")
      .select("id, bed_label, status, room:rooms(id, room_number, monthly_rent)")
      .eq("property_id", propertyId),
    supabase
      .from("bed_assignments")
      .select("bed_id")
      .eq("property_id", propertyId)
      .eq("is_active", true)
      .is("end_date", null),
  ]);

  const active = new Set((assignments ?? []).map((row) => row.bed_id));
  const vacant = (beds ?? []).filter(
    (bed) =>
      classifyBed({
        status: bed.status,
        hasActiveAssignment: active.has(bed.id),
      }) === "vacant"
  );

  return NextResponse.json({ beds: vacant });
}
