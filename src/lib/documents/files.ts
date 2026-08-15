export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

export const DOCUMENT_MIME: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DOCUMENT_TYPES = [
  "profile_photo",
  "aadhaar",
  "pan",
  "passport",
  "driving_license",
  "college_id",
  "employee_id",
  "agreement",
  "police_verification",
  "other",
] as const;

export type DocumentTypeValue = (typeof DOCUMENT_TYPES)[number];

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function extensionForMime(mime: string, fileName: string): string | null {
  const fromName = fileName.split(".").pop()?.toLowerCase() ?? "";
  const normalizedMime = (mime === "image/jpg" ? "image/jpeg" : mime).toLowerCase().split(";")[0]?.trim() ?? "";
  if (fromName && DOCUMENT_MIME[fromName]) {
    if (!normalizedMime || DOCUMENT_MIME[fromName] === normalizedMime) return fromName;
    return null;
  }
  if (normalizedMime === "application/pdf") return "pdf";
  if (normalizedMime === "image/jpeg") return "jpeg";
  if (normalizedMime === "image/png") return "png";
  if (normalizedMime === "image/webp") return "webp";
  return null;
}

export function validateUploadFile(file: { name: string; type: string; size: number }): { error?: string; ext?: string; mime?: string } {
  if (!file.size) return { error: "File and resident are required." };
  if (file.size > DOCUMENT_MAX_BYTES) return { error: "This file is too large. Choose a smaller file." };
  const ext = extensionForMime(file.type, file.name);
  if (!ext) return { error: "This file type isn't supported." };
  return { ext, mime: DOCUMENT_MIME[ext] };
}

export function documentStoragePath(organizationId: string, residentId: string, documentId: string, ext: string): string | null {
  if (!isUuid(organizationId) || !isUuid(residentId) || !isUuid(documentId)) return null;
  const safeExt = ext.toLowerCase();
  if (!DOCUMENT_MIME[safeExt]) return null;
  return `${organizationId.toLowerCase()}/${residentId.toLowerCase()}/${documentId.toLowerCase()}.${safeExt}`;
}

export function parseDocumentStoragePath(path: string): {
  organizationId: string;
  residentId: string;
  documentId: string;
  ext: string;
} | null {
  const parts = path.split("/");
  if (parts.length !== 3) return null;
  const [organizationId, residentId, file] = parts;
  const dot = file.lastIndexOf(".");
  if (dot <= 0) return null;
  const documentId = file.slice(0, dot);
  const ext = file.slice(dot + 1).toLowerCase();
  if (!isUuid(organizationId) || !isUuid(residentId) || !isUuid(documentId)) return null;
  if (!DOCUMENT_MIME[ext]) return null;
  if (file.slice(dot + 1).includes(".")) return null;
  return {
    organizationId: organizationId.toLowerCase(),
    residentId: residentId.toLowerCase(),
    documentId: documentId.toLowerCase(),
    ext,
  };
}

export function storagePathMatchesDocument(input: {
  storagePath: string;
  organizationId: string;
  residentId: string;
  documentId: string;
}): boolean {
  const parsed = parseDocumentStoragePath(input.storagePath);
  if (!parsed) return false;
  return (
    parsed.organizationId === input.organizationId.toLowerCase() &&
    parsed.residentId === input.residentId.toLowerCase() &&
    parsed.documentId === input.documentId.toLowerCase()
  );
}

export function sanitizeDisplayFileName(name: string | null | undefined): string {
  const base = (name ?? "document").replace(/[/\\]/g, "").replace(/[\r\n"]/g, "").trim();
  const cleaned = base.replace(/[^\w.\- ()]/g, "_").slice(0, 120);
  return cleaned || "document";
}

export function isAllowedDocumentType(value: string): value is DocumentTypeValue {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}
