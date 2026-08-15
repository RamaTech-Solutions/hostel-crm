import { NextResponse } from "next/server";

/** Legacy signed-url endpoint removed: documents are streamed from /api/documents/[id]/content. */
export async function GET() {
  return NextResponse.json({ error: "This document is no longer available." }, { status: 410 });
}
