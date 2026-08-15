# Awaasly security model

## Organization isolation

Every operational table is filtered by `public.get_user_organization_id()` (from `profiles` for `auth.uid()`).

A user in Organization A must not read or write Organization B rows via PostgREST, the JS client, or Storage.

## Property isolation

`public.get_user_property_ids()`:

- **owner:** all properties in their organization
- **property_admin / viewer:** `property_user_assignments` only

Resident child tables (`resident_contacts`, `resident_documents`, `security_deposits`, `room_transfers`) use `public.can_access_resident(resident_id)` → `residents.property_id`.

Residents with `property_id IS NULL` are **owner-only**.

## Role permissions

Helpers:

- `get_user_role()` — role for the user’s current organization (join on `profiles.organization_id`)
- `can_user_write()` — owner or property_admin **and not a demo org** (`can_mutate_tenant()`)
- `can_user_own()` — owner **and not a demo org**

Demo org (`organizations.is_demo`): no persistent business writes except logout / start own workspace. See [AWAASLY_PRODUCTION_HARDENING.md](./AWAASLY_PRODUCTION_HARDENING.md).

Viewers: SELECT on assigned properties; no INSERT/UPDATE/DELETE on operational data.

Sprint 3 inventory matrix (enforced in RLS, not only UI):

- **owner:** create/archive/reactivate properties; update property metadata; floor insert/update/delete
- **property_admin:** room and bed writes on assigned properties; cannot update properties or floors
- **viewer:** read only

`properties_update` and `floors_*` write policies require `can_user_own()`. `rooms_*` and `beds_*` writes still use `can_user_write()` plus assigned `property_id`.

## Storage isolation

Bucket `resident-documents` is private (`public = false`), 5 MB, MIME allowlist PDF/JPEG/PNG/WebP.

Object name:

```text
{organization_id}/{resident_id}/{document_id}.{ext}
```

`public.storage_resident_id_from_object_name` validates that three-segment UUID path (fail closed) then Storage SELECT uses `can_access_resident(resident_id)`. INSERT/DELETE also require `can_user_write()`. There is no Storage UPDATE policy and no anonymous policy.

The app streams files from `GET /api/documents/[id]/content`. It does not redirect the browser to a Storage signed URL.

Details: [AWAASLY_DOCUMENT_SECURITY.md](./AWAASLY_DOCUMENT_SECURITY.md).

## SECURITY DEFINER

Helpers and `bootstrap_organization` are DEFINER to avoid RLS recursion and to insert the first org/profile.

All use `SET search_path = ''` and `public.` / `auth.` qualification.

`EXECUTE` granted to `authenticated` only; revoked from `PUBLIC` and `anon`.

`bootstrap_organization` cannot take a `user_id` argument.

## Service role

`SUPABASE_SERVICE_ROLE_KEY` is server-only (seed / admin). It must never ship to the browser or Vercel `NEXT_PUBLIC_*` variables. Service role bypasses RLS — do not use it in user request paths.
