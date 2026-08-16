import { NextResponse } from "next/server";
import { getAuthUser, canAccessProperty } from "@/lib/auth/get-user";
import { getAvailableBeds } from "@/lib/queries";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");
  if (!propertyId || !canAccessProperty(user, propertyId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const beds = await getAvailableBeds(propertyId);
  return NextResponse.json({ beds });
}
