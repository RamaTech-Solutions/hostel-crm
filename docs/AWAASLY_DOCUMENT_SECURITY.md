# Awaasly document security (Sprint 6)

Private resident files for the UrbanStay pilot. This is **not** a KYC verification engine, OCR pipeline, malware scanner, or compliance certification.

See also: [AWAASLY_SECURITY_MODEL.md](./AWAASLY_SECURITY_MODEL.md).

## Path

```text
{organization_id}/{resident_id}/{document_id}.{ext}
```

Documents belong to the resident. Access follows the resident’s **current** authorized property via `can_access_resident`. The object key does not include property id, resident name, mobile, email, ID number, original filename, or property name.

## Bucket

- Name: `resident-documents`
- `public = false`
- `file_size_limit = 5242880` (5 MB)
- MIME allowlist: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`

Bucket settings are defense-in-depth. The server also validates size, MIME, and extension. **Magic-byte sniffing is deferred (P1).**

## View / download

`GET /api/documents/[id]/content`

Authenticate, load `resident_documents` through RLS, authorize the resident, validate the stored path, download the object server-side, stream bytes.

- `Cache-Control: private, no-store`
- Preview: `Content-Disposition: inline`
- Download (`?download=1`): `attachment; filename="<sanitized display name>"`

Do not 302 to a Storage signed URL. Do not persist or log signed URLs. Legacy `/api/documents/[id]/signed-url` returns 410.

Clients never supply `storage_path` for view, download, or delete.

## Profile photo

`profile_photo` is a `resident_documents` row. The UI uses `/api/documents/{id}/content`. Do not store a public URL, signed URL, or bare UUID in `residents.photo_url` for rendering.

## Upload idempotency

Same client `documentId` (UUID):

- **A** metadata exists for that id + resident + path → success
- **B** object exists, metadata missing → insert metadata only
- **C** upload ok, metadata fails → remove object, friendly error
- **D** upload fails → no metadata row

`upsert: false`. Never overwrite an object in place.

## Delete

Authorize → remove Storage object (not-found is already removed) → delete metadata. If metadata delete fails after Storage success, retry once and return a cleanup error. Do not report success with dangling metadata.

## Roles

| Role | View | Upload | Delete |
| --- | --- | --- | --- |
| owner | current authorized residents | yes | yes |
| property_admin | assigned-property residents | yes | yes |
| viewer | assigned-property residents | no | no |
| anonymous | no | no | no |

Transfer and checkout do not delete documents. Access follows the resident’s current `property_id` (owner-only if `property_id` is null).

## Out of scope

OCR, malware infrastructure, public sharing, compliance claims, KYC verification engine, Sprint 4/5 redesign.
