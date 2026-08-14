import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, canAccessProperty } from "@/lib/auth/get-user";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");
  if (!propertyId || !canAccessProperty(user, propertyId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("beds")
    .select("id, bed_label, room:rooms(id, room_number, monthly_rent)")
    .eq("property_id", propertyId)
    .eq("status", "available");

  return NextResponse.json({ beds: data ?? [] });
}
