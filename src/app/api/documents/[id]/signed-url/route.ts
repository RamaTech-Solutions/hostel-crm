import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/get-user";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("resident_documents")
    .select("storage_path")
    .eq("id", id)
    .eq("organization_id", user.organization.id)
    .single();

  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase.storage
    .from("resident-documents")
    .createSignedUrl(doc.storage_path, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
