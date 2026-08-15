import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser, canAccessResidentRecord } from "@/lib/auth/get-user";
import { DOCUMENT_ERRORS } from "@/lib/documents/errors";
import { DOCUMENT_MIME, sanitizeDisplayFileName, storagePathMatchesDocument } from "@/lib/documents/files";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: DOCUMENT_ERRORS.unauthorized }, { status: 401 });

  const { id } = await params;
  const download = new URL(request.url).searchParams.get("download") === "1";
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("resident_documents")
    .select("id, resident_id, organization_id, storage_path, mime_type, file_name")
    .eq("id", id)
    .maybeSingle();

  if (!doc || doc.organization_id !== user.organization.id) {
    return NextResponse.json({ error: DOCUMENT_ERRORS.unauthorized }, { status: 404 });
  }

  const { data: resident } = await supabase
    .from("residents")
    .select("id, organization_id, property_id")
    .eq("id", doc.resident_id)
    .maybeSingle();

  if (!resident || !canAccessResidentRecord(user, resident)) {
    return NextResponse.json({ error: DOCUMENT_ERRORS.unauthorized }, { status: 404 });
  }

  if (
    !storagePathMatchesDocument({
      storagePath: doc.storage_path,
      organizationId: doc.organization_id,
      residentId: doc.resident_id,
      documentId: doc.id,
    })
  ) {
    return NextResponse.json({ error: DOCUMENT_ERRORS.missing }, { status: 404 });
  }

  const { data: file, error } = await supabase.storage.from("resident-documents").download(doc.storage_path);
  if (error || !file) {
    return NextResponse.json({ error: DOCUMENT_ERRORS.missing }, { status: 404 });
  }

  const mime = doc.mime_type && Object.values(DOCUMENT_MIME).includes(doc.mime_type) ? doc.mime_type : "application/octet-stream";
  const filename = sanitizeDisplayFileName(doc.file_name);
  const buffer = Buffer.from(await file.arrayBuffer());

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": download
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`,
    },
  });
}
