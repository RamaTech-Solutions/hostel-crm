import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DOCUMENT_MAX_BYTES,
  documentStoragePath,
  parseDocumentStoragePath,
  sanitizeDisplayFileName,
  storagePathMatchesDocument,
  validateUploadFile,
} from "@/lib/documents/files";
import { canAccessResidentRecord } from "@/lib/auth/permissions";
import type { AuthUser } from "@/types/database";

const org = "11111111-1111-4111-8111-111111111111";
const resident = "22222222-2222-4222-8222-222222222222";
const documentId = "33333333-3333-4333-8333-333333333333";
const property = "44444444-4444-4444-8444-444444444444";

function user(role: AuthUser["role"], assigned: string[] = []): AuthUser {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    email: "owner@example.com",
    role,
    assignedPropertyIds: assigned,
    organization: { id: org } as AuthUser["organization"],
    profile: {} as AuthUser["profile"],
  };
}

describe("document storage path", () => {
  it("uses organization/resident/document.ext and no PII", () => {
    const path = documentStoragePath(org, resident, documentId, "pdf");
    expect(path).toBe(`${org}/${resident}/${documentId}.pdf`);
    expect(path).not.toContain("Ravi");
    expect(path).not.toContain("9876543210");
    expect(path).not.toContain("@");
    expect(path).not.toContain("aadhaar.pdf");
    expect(path).not.toContain(property);
  });

  it("rejects malformed paths without casting", () => {
    expect(parseDocumentStoragePath("not-a-path")).toBeNull();
    expect(parseDocumentStoragePath(`${org}/${resident}/not-uuid.pdf`)).toBeNull();
    expect(parseDocumentStoragePath(`${org}/${property}/${resident}/${documentId}.pdf`)).toBeNull();
  });

  it("matches trusted metadata segments", () => {
    const storagePath = `${org}/${resident}/${documentId}.png`;
    expect(
      storagePathMatchesDocument({
        storagePath,
        organizationId: org,
        residentId: resident,
        documentId,
      })
    ).toBe(true);
    expect(
      storagePathMatchesDocument({
        storagePath,
        organizationId: org,
        residentId: resident,
        documentId: "66666666-6666-4666-8666-666666666666",
      })
    ).toBe(false);
  });
});

describe("upload validation", () => {
  it("accepts allowlisted types under 5 MB", () => {
    expect(validateUploadFile({ name: "id.pdf", type: "application/pdf", size: 1024 })).toEqual({
      ext: "pdf",
      mime: "application/pdf",
    });
    expect(validateUploadFile({ name: "photo.jpg", type: "image/jpeg", size: 2048 }).ext).toBe("jpg");
  });

  it("rejects oversize and disallowed types", () => {
    expect(validateUploadFile({ name: "id.pdf", type: "application/pdf", size: DOCUMENT_MAX_BYTES + 1 }).error).toBeTruthy();
    expect(validateUploadFile({ name: "note.txt", type: "text/plain", size: 10 }).error).toBeTruthy();
    expect(validateUploadFile({ name: "scan.svg", type: "image/svg+xml", size: 10 }).error).toBeTruthy();
  });

  it("sanitizes display names without using them as keys", () => {
    expect(sanitizeDisplayFileName('Ravi\\"aadhaar.pdf')).not.toContain('"');
    expect(sanitizeDisplayFileName("../secret.pdf")).not.toContain("/");
  });
});

describe("resident document access", () => {
  it("lets viewers read assigned residents and denies writes in app helpers", () => {
    const assigned = user("viewer", [property]);
    expect(canAccessResidentRecord(assigned, { organization_id: org, property_id: property })).toBe(true);
    expect(canAccessResidentRecord(assigned, { organization_id: org, property_id: "77777777-7777-4777-8777-777777777777" })).toBe(false);
  });

  it("keeps unassigned former residents owner-only", () => {
    expect(canAccessResidentRecord(user("owner"), { organization_id: org, property_id: null })).toBe(true);
    expect(canAccessResidentRecord(user("property_admin", [property]), { organization_id: org, property_id: null })).toBe(false);
  });
});

describe("sprint 6 migration", () => {
  it("uses resident-scoped storage policies without UPDATE or property folders", () => {
    const sql = readFileSync(
      resolve(__dirname, "../../supabase/migrations/20260815190000_document_security.sql"),
      "utf8"
    );
    expect(sql).toContain("{organization_id}/{resident_id}/{document_id}.{ext}");
    expect(sql).toContain("file_size_limit = 5242880");
    expect(sql).toContain("application/pdf");
    expect(sql).toContain("public = false");
    expect(sql).toContain("storage_resident_id_from_object_name");
    expect(sql).toContain("can_access_resident");
    expect(sql).toContain("DROP POLICY IF EXISTS \"resident_documents_update\" ON public.resident_documents");
    expect(sql).not.toMatch(/CREATE POLICY "resident_documents_update"/);
    expect(sql).not.toContain("storage.foldername");
    expect(sql).not.toContain("TO anon");
    expect(sql).not.toMatch(/USING \(bucket_id = 'resident-documents'\);/);
  });
});
