# Awaasly production hardening (Sprint 8)

## Demo write lock

`organizations.is_demo = true` blocks persistent business-data mutation.

Database:

- `can_mutate_tenant()` is false for the demo org
- `can_user_write()` requires owner/property_admin **and** `can_mutate_tenant()`
- `can_user_own()` requires owner **and** `can_mutate_tenant()`
- Owner-only RLS policies and `void_rent_charge` / `update_org_rent_due_day` use `can_user_own()`

App:

- `canWrite` / `canOwn` hide write CTAs in demo
- Mutations still fail at RLS if a CTA is missed
- Allowed: logout (`signOut`) and Start Free (`startOwnWorkspace` → sign out, then `NEXT_PUBLIC_PRIMARY_APP_URL/signup` when set, else `/signup`)

## Demo auth identity (P0)

`/demo` signs into the shared demo owner. A `BEFORE UPDATE` trigger on `auth.users` rejects email, password, phone, metadata, email/phone change, ban, and delete changes for users whose profile org is demo. Login timestamps may still update.

Demo login rate limit is **best-effort in-memory per instance**, not Redis/CAPTCHA.

Seed does not print demo passwords. `.env.example` lists `DEMO_OWNER_EMAIL` / `DEMO_OWNER_PASSWORD` names only.

## Environment separation (Sprint 8.1)

- Staging: existing `pg-crm-demo` (demo org + local/Preview).
- Production: a **new empty** Supabase project. No demo credentials, no seed, no UrbanStay copy.
- Production **Explore Demo** uses `NEXT_PUBLIC_DEMO_URL` (stable staging `/demo`).
- Staging demo **Start Free** uses `NEXT_PUBLIC_PRIMARY_APP_URL` (production `/signup`).
- `getAppUrl()` never falls back to `https://hostel-crm.vercel.app`.
- Seed requires `ALLOW_DEMO_SEED=1` and `CONFIRM_SUPABASE_PROJECT_REF` matching the URL’s project ref; production ref always aborts.
- Service role is local-only. Never `NEXT_PUBLIC_`.

Preview `NEXT_PUBLIC_SUPABASE_URL` host/ref must differ from Production. If they match, environment separation is **not ready**.

## npm audit HIGH (do not force-fix in 8.1)

| Package | Advisories | Path | Exposure | Action |
|---|---|---|---|---|
| `postcss` ≤8.5.22 | GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849 | `next` → `postcss` | Mainly CSS build-time | Accept; Next 16 later |
| `sharp` `<0.35.0` | GHSA-f88m-g3jw-g9cj | `next` → `sharp` | Next Image Optimization | Accept; documents are not processed via `next/image` |

Do not run `npm audit fix --force`. Revisit at the final pre-pilot release gate.

## Lists and search

Residents and Payments use 50 rows per page with Previous/Next. Filter/search/period changes reset to page 1. Search is trimmed, length-capped, and stripped of `% _ , ( ) \\ "` before PostgREST `.or()` / `ilike`.

## API and headers

Unauthenticated `/api/*` returns **401 JSON**. Pages still redirect to login.

Response headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` camera/microphone/geolocation disabled. No CSP in this sprint.

CSV export and document content use `Cache-Control: private, no-store`.

## Notifications

`markNotificationRead` was removed. The header bell links to `/dashboard#attention` with no badge/count.

## Errors and confirms

`error.tsx` and `global-error.tsx` show a short recovery message (no stacks). Destructive actions use a confirmation dialog (archive property, delete floor/room, checkout, cancel rent charge, delete document). Inventory buttons disable while a request is in flight.
