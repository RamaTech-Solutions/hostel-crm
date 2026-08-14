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
- `can_user_write()` — owner or property_admin

Viewers: SELECT on assigned properties; no INSERT/UPDATE/DELETE on operational data.

## Storage isolation

Bucket `resident-documents` is private.

Object name:

```text
{organization_id}/{property_id}/{resident_id}/{safe-file-name}
```

Policies compare `(storage.foldername(name))[1]` to the user’s org and `[2]` to assigned properties. Owners may access all org prefixes. Viewers may SELECT only. Writes require `can_user_write()`.

The app builds the path on the server after loading the resident; clients do not supply org/property IDs.

## SECURITY DEFINER

Helpers and `bootstrap_organization` are DEFINER to avoid RLS recursion and to insert the first org/profile.

All use `SET search_path = ''` and `public.` / `auth.` qualification.

`EXECUTE` granted to `authenticated` only; revoked from `PUBLIC` and `anon`.

`bootstrap_organization` cannot take a `user_id` argument.

## Service role

`SUPABASE_SERVICE_ROLE_KEY` is server-only (seed / admin). It must never ship to the browser or Vercel `NEXT_PUBLIC_*` variables. Service role bypasses RLS — do not use it in user request paths.
