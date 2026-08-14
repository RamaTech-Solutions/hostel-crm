# Awaasly — Supabase SaaS Readiness Audit

**Date:** 14 August 2026  
**Scope:** Repository schema, RLS SQL, seed script, Next.js clients/actions.  
**Remote database:** Not modified. No `db push`, no destructive SQL.  
**Source of truth:** SQL in `supabase/migrations/` plus application usage. Live Dashboard drift is possible if extra objects were created outside these files.

**Overall rating: READY WITH CHANGES**

The current schema is already organization-scoped and can be **evolved** into a multi-tenant SaaS. It is **not** ready to host real customer PII until storage isolation and a small set of RLS/membership gaps are hardened. Do not replace the database. Baseline it, then apply additive migrations.

---

## Executive Summary

The demo was designed as multi-tenant from day one: almost every operational table has `organization_id`, properties belong to organizations, and RLS helpers scope queries by `auth.uid()` via `profiles`. That is the right foundation for Awaasly.

What it is today: a **single-tenant-shaped demo** (one org, `profiles.organization_id` is 1:1 with a user, no signup pipeline, no subscription fields, floors unused, payments are receipts not invoices).

What blocks real pilots:

1. **P0 — Storage:** any authenticated user can read/upload/delete any object in `resident-documents`.
2. **P0-adjacent — Property-scoped tables leak inside an org:** several tables are org-wide, so a manager of Property A can read Property B contacts/documents/deposits via the API.
3. No Auth trigger for profile/org creation — signup does not exist.
4. Migration history is hand-applied SQL, not a linked Supabase CLI project.

---

## Existing Architecture

```text
auth.users.id
    └── profiles.id  (PK = auth.users.id)
            ├── organization_id → organizations.id   [exactly one org per user]
            └── user_roles.user_id
                    └── organization_id → organizations.id
                    └── role enum: owner | property_admin | viewer

organizations
    └── properties.organization_id
            ├── property_user_assignments (user ↔ property)
            ├── floors (optional; unused in seed)
            ├── rooms.property_id  (floor_id nullable)
            │       └── beds.room_id
            └── residents.property_id (nullable ON DELETE SET NULL)
                    ├── current_bed_assignment_id → bed_assignments
                    ├── resident_contacts
                    ├── resident_documents
                    ├── security_deposits
                    ├── payments
                    ├── bed_assignments (history)
                    └── room_transfers
```

**Connection chain used by the app** ([`src/lib/auth/get-user.ts`](../src/lib/auth/get-user.ts)):

```text
supabase.auth.getUser()
  → profiles where id = auth.uid()
  → user_roles where user_id = auth.uid()   (single row expected)
  → organizations where id = profile.organization_id
  → if role is property_admin or viewer:
        property_user_assignments.property_id[]
```

There is **no** `on_auth_user_created` trigger. Demo users were created by [`scripts/seed.ts`](../scripts/seed.ts) using the service role (`auth.admin.createUser` + inserts into `organizations`, `profiles`, `user_roles`).

Clients:

- Browser: [`src/lib/supabase/client.ts`](../src/lib/supabase/client.ts) — anon key
- Server RSC/actions: [`src/lib/supabase/server.ts`](../src/lib/supabase/server.ts) — user JWT + cookies
- Middleware: [`src/lib/supabase/middleware.ts`](../src/lib/supabase/middleware.ts)
- Seed/admin: [`src/lib/supabase/admin.ts`](../src/lib/supabase/admin.ts) — service role, server-only

---

## ER Model (actual)

```text
auth.users
     │
     └── profiles ──────────── organizations
             │                      │
             ├── user_roles ────────┤
             │                      │
             └── property_user_assignments
                                    │
                                    └── properties
                                           │
                          ┌────────────────┼────────────────┐
                          │                │                │
                       floors           rooms            residents
                       (empty in         │                  │
                        seed)            └── beds           │
                                           │                │
                                           └── bed_assignments ◄── current_bed_assignment_id
                                                                │
                    resident_contacts ──────────────────────────┤
                    resident_documents ─────────────────────────┤
                    security_deposits ──────────────────────────┤
                    payments ───────────────────────────────────┤
                    room_transfers (from/to bed_assignments) ───┘

                    activity_logs (org + optional user)
                    notifications (org + optional user + optional property)
```

### Broken / unused / redundant

| Finding | Severity |
|---------|----------|
| `floors` exists; seed never inserts floors; `rooms.floor_id` is nullable | Unused path, not broken |
| `properties.floor_count` is a number, not related to `floors` rows | Redundant denormalization |
| `properties.manager_id` vs `property_user_assignments` | Two ways to name a manager; assignments actually enforce access |
| `residents.monthly_rent` vs `rooms.monthly_rent` vs `beds.monthly_rent` | Three rent sources; app uses resident snapshot |
| `get_user_role()` uses `LIMIT 1` with no `ORDER BY` | Unsafe if a user ever has multiple `user_roles` rows |
| No `is_demo` / `tenant_type` on `organizations` | Demo org identified only by slug `urbanstay-pg` |

---

## Table inventory

All PKs are `uuid`. Soft-delete: **none** (except `is_active` on orgs/profiles/rooms, `property.status`).

### organizations

| | |
|--|--|
| PK | `id` |
| FKs | none |
| org_id | n/a (this is the tenant) |
| property_id | no |
| Columns | `name`, `slug` unique, `logo_url`, `settings jsonb`, `is_active`, timestamps |
| Indexes | unique `slug` |
| Classification | **SAFE** as tenant root; **NEEDS REVIEW** for billing fields |

### profiles

| | |
|--|--|
| PK | `id` = `auth.users.id` ON DELETE CASCADE |
| FKs | `organization_id` → organizations **ON DELETE CASCADE** |
| org_id | yes |
| Columns | `full_name`, `email`, `phone`, `avatar_url`, `is_active` |
| Indexes | org, email |
| Classification | **NEEDS REVIEW** — one org per user; cannot join a second org |

### user_roles

| | |
|--|--|
| PK | `id` |
| FKs | `user_id` → profiles CASCADE; `organization_id` → organizations CASCADE |
| Unique | `(user_id, organization_id)` |
| Columns | `role` enum owner / property_admin / viewer |
| Classification | **SAFE** for org-level roles; **NEEDS REVIEW** vs future `organization_members` |

### property_user_assignments

| | |
|--|--|
| PK | `id` |
| FKs | user, property, organization (all CASCADE on delete) |
| Unique | `(user_id, property_id)` |
| Classification | **SAFE** for property-level access |

### properties

| | |
|--|--|
| PK | `id` |
| FKs | `organization_id` CASCADE; `manager_id` SET NULL |
| Unique | `(organization_id, internal_code)` (NULLs can duplicate in PostgreSQL) |
| Classification | **SAFE** — multiple properties per org already |

### floors

| | |
|--|--|
| PK | `id` |
| FKs | property CASCADE, organization CASCADE |
| Unique | `(property_id, floor_number)` |
| Classification | **SAFE** structurally; unused in demo data |

### rooms

| | |
|--|--|
| PK | `id` |
| FKs | property CASCADE, `floor_id` SET NULL, organization CASCADE |
| Unique | `(property_id, room_number)` |
| Classification | **SAFE**; floor optional |

### beds

| | |
|--|--|
| PK | `id` |
| FKs | room CASCADE, property CASCADE, organization CASCADE |
| Unique | `(room_id, bed_label)` |
| Extra | partial unique on active `bed_assignments` |
| Classification | **SAFE** |

### residents

| | |
|--|--|
| PK | `id` |
| FKs | org CASCADE; property **SET NULL**; current assignment SET NULL |
| Status | `active`, `notice_period`, `checked_out`, `blacklisted` |
| Classification | **SAFE** for lifecycle; **NEEDS REVIEW** on property SET NULL visibility |

### bed_assignments

| | |
|--|--|
| History | `start_date` / `end_date` / `is_active` |
| Unique | one active assignment per bed (partial index) |
| Delete | CASCADE from resident/bed/room/property — **history can vanish** |
| Classification | **NEEDS REVIEW** (cascade) |

### resident_contacts / resident_documents / security_deposits / room_transfers

All have `organization_id`. Contacts/documents/deposits/transfers **do not** have `property_id`.  
Classification: **NEEDS REVIEW** (org isolation yes; property isolation no).

### payments

Has `organization_id` + `property_id`. Transaction log, not a charge ledger.  
Classification: **SAFE** for receipts; **NEEDS REVIEW** for rent-due model.

### activity_logs / notifications

Org-scoped. Notifications optional `user_id` / `property_id`. No `updated_at` on logs.  
Classification: **SAFE** for demo; **NEEDS REVIEW** for property-admin visibility.

---

## Multi-tenant assessment

| Question | Answer |
|----------|--------|
| Direct `organization_id` on ops tables? | Yes on all listed ops tables except it is implicit on `organizations` itself |
| Derived org via FK if missing? | Property-scoped tables also have org_id denormalized |
| Cross-org query via PostgREST? | **Org isolation is intended.** Storage policies break it for files. Table RLS generally filters by `get_user_organization_id()` |
| Explicit membership? | Implicit: `profiles.organization_id` + `user_roles` |
| User in multiple orgs? | **No.** Profile has a single `organization_id` |
| Multiple owners/managers/viewers per org? | **Yes** (multiple `user_roles` rows; unique per user+org) |
| Property-level access? | `property_user_assignments` + `get_user_property_ids()`. Owners see all org properties |

**Demo isolation:** org slug `urbanstay-pg`. RLS would isolate a second org in the same project **for tables**. Storage would **not**.

**Recommendation:** keep demo org in the same project for now; move demo to a separate Supabase project before storing real Aadhaar/PAN files at scale.

---

## RLS matrix (from `002_rls_policies.sql`)

All listed tables: **RLS enabled**.

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| organizations | own org | none | owner | none |
| profiles | same org | owner | own row | none |
| user_roles | same org | owner ALL | owner ALL | owner ALL |
| properties | assigned/owner | owner | owner or assigned writer | owner |
| property_user_assignments | same org | owner ALL | owner ALL | owner ALL |
| floors / rooms / beds | assigned properties | write if can_write | same | same (FOR ALL) |
| residents | org + (null property OR assigned) | write if can_write | same | same |
| bed_assignments | assigned properties | can_write | can_write | can_write |
| resident_contacts | **entire org** | can_write org-wide | can_write | can_write |
| room_transfers | entire org | INSERT can_write | none | none |
| payments | assigned properties | can_write | can_write | can_write |
| security_deposits | entire org | can_write org-wide | can_write | can_write |
| resident_documents | entire org | can_write org-wide | can_write | can_write |
| activity_logs | entire org | any org member | none | none |
| notifications | org + (broadcast or self) | any org member | self or owner | none |

Helpers (`SECURITY DEFINER STABLE`):

- `get_user_organization_id()` — `profiles.organization_id` for `auth.uid()`
- `get_user_role()` — `LIMIT 1` role
- `get_user_property_ids()` — all org properties if owner, else assignments
- `can_user_write()` — owner or property_admin

`auth.uid()` is used directly on profiles update and notifications; otherwise via helpers.

### P0 SECURITY ISSUE — Storage

[`003_storage.sql`](../supabase/migrations/003_storage.sql):

```sql
USING (bucket_id = 'resident-documents')
```

Any **authenticated** user (including another future tenant) can SELECT / INSERT / DELETE **all** objects in the bucket. Path convention in the app is `organization_id/property_id/resident_id/filename`, but policies do **not** check the path. Direct Storage API bypasses the signed-URL org check in [`src/app/api/documents/[id]/signed-url/route.ts`](../src/app/api/documents/[id]/signed-url/route.ts).

**P0:** fix storage policies before real documents.

### Other RLS gaps (not cross-org, but not SaaS-tight)

- Property admin can read **all org** contacts, documents, deposits, transfers, activity (not limited to assigned properties).
- Residents with `property_id IS NULL` are visible to every org member who can query residents.
- `FOR ALL` write policies often omit explicit `WITH CHECK` (Postgres defaults WITH CHECK to USING; still worth making explicit).
- SECURITY DEFINER functions do not set `search_path`. Treat as **P1** hardening.
- Viewer cannot write (`can_user_write` false) — matches product intent.
- No INSERT policy on `organizations` — new tenants cannot self-serve signup (by design today).

---

## Role assessment

| Role | Scope | Properties | Write |
|------|--------|------------|--------|
| owner | organization | all via `get_user_property_ids` | yes |
| property_admin | organization role + property list | assigned only (for property-scoped tables) | yes |
| viewer | organization role + property list | assigned only | no (intended) |

Roles are **organization-level** (`user_roles`) plus **property-level grants** (`property_user_assignments`). They are not global platform roles.

**Sufficient for MVP** if storage and property-scoped RLS are tightened.

**Later:** introduce `organization_members` (user_id, organization_id, role, status) when a user must belong to multiple orgs. Do **not** create it until multi-org membership is a product requirement. Current `user_roles` + `profiles.organization_id` is enough for one-org-per-login.

---

## Organizations (SaaS tenant)

**Existing:** `id`, `name`, `slug`, `logo_url`, `settings`, `is_active`, timestamps.

**Missing MVP:** `status` (active/suspended) can reuse `is_active`; optional `onboarding_completed_at`.

**Future (do not add now):** `plan`, `trial_started_at`, `trial_ends_at`, `subscription_status`, billing customer id.

---

## Properties

`properties.organization_id` is **NOT NULL** with FK. One org → many properties is already supported (seed creates three). Deleting an organization **CASCADE** deletes properties, rooms, beds, residents, payments. Deleting a property CASCADE deletes rooms/beds/assignments/payments and SET NULL on residents.property_id.

---

## Floor → room → bed

**Intended:** property → floor → room → bed.  
**Actual demo:** property → room → bed. `floor_id` is optional.

Seed never creates `floors` rows; that is why the live DB can show **0 floors** while rooms/beds are populated.

**Safest transition (later, not now):**

1. Keep `floor_id` nullable.
2. Backfill: for each property, insert a default floor (e.g. “Unassigned”) and set `rooms.floor_id`.
3. Then optionally require `floor_id` in a later migration.
4. Do not rewrite room numbers or bed IDs.

---

## Resident lifecycle

Supported today:

| Stage | Support |
|-------|---------|
| Prospect | **No** (no leads table) |
| Onboarding | Yes (app wizard) |
| Check-in / bed assign | Yes (`bed_assignments`) |
| Rent amount | Snapshot on resident |
| Payments | Receipts only |
| Room transfer | Yes (`room_transfers` + close/open assignments) |
| Notice | `status = notice_period` |
| Checkout | status checked_out; bed released; assignment ended |
| Former resident | Row kept (not deleted) |

Bed history is **preserved** unless parent rows CASCADE-delete. Checkout does not delete the resident.

**MVP gap:** prospect/lead is optional; skip unless sales needs it. **Charge vs payment** is the real gap (see below).

---

## Rent and payment model

`payments` is a **transaction log**: amount, date, method, optional `rent_month`, status paid/partial/pending/overdue.

Dashboard “expected vs collected” **computes** expected from active residents’ `monthly_rent` minus payments for the month — it is not a ledger of charges.

**Recommendation (later):** add `rent_charges` (or `invoices`) per resident per period: `amount_due`, `due_date`, `status`, linked `payment_ids`. Do **not** create it in this audit.

---

## Security deposits

Existing: `amount_held`, `amount_refunded`, `deductions`, `refund_date`, `status` (held / partial_refund / refunded / forfeited), notes.

**Missing for MVP:** explicit `amount_expected` vs `amount_received` (held is used as received). Minimum later change: add `amount_expected` or treat `amount_held` as received and keep expected on `residents.security_deposit_amount`.

---

## Document storage

| Item | Current |
|------|---------|
| Bucket | `resident-documents` (intended private) |
| App path | `{organization_id}/{property_id}/{resident_id}/{timestamp}-{filename}` |
| Metadata | `resident_documents` table |
| Storage RLS | **any authenticated user, whole bucket** |
| App signed URL | org-checked on metadata, then Storage sign |

**P0:** storage policies must require path prefix = user’s `organization_id` (and preferably property assignment). Do not migrate files yet.

---

## Auth user creation

No DB trigger on `auth.users`. Signup flow **does not exist**. Demo: service-role seed.

**Needed later (not now):**

```text
Create Auth User
  → profile
  → organization
  → user_roles (owner)
  → onboarding
```

Must be a single transaction / Edge Function / trigger with locked-down SECURITY DEFINER.

---

## Functions, triggers, enums

**Function:** `update_updated_at_column()` — BEFORE UPDATE on most tables.

**RLS helpers:** four SECURITY DEFINER SQL functions (see above). No `SET search_path`.

**Triggers:** `*_updated_at` only. No auth signup trigger.

**RPCs / views / materialized views:** none in repo SQL.

**Enums:** `user_role`, `property_status`, `room_type`, `gender_restriction`, `bed_status`, `resident_status`, `id_type`, `agreement_status`, `contact_type`, `payment_type`, `payment_method`, `payment_status`, `deposit_status`, `document_type`, `activity_action`, `notification_type`, `notification_severity`, `notification_channel`.

---

## Index audit

Present: org/property/status/mobile/name on residents; payments org/property/resident/month/status; beds property/status/room; activity created_at; notifications unread partial.

**Later, only if query plans need it:** `(organization_id, property_id)` composite on residents/payments; `bed_assignments (resident_id, is_active)`; `user_roles (organization_id, user_id)` already unique.

Do not add indexes in this task.

---

## Cascade / delete safety

| Action | Effect |
|--------|--------|
| Delete auth user | profile CASCADE → roles, assignments |
| Delete organization | **wipes all tenant data** |
| Delete property | rooms/beds/assignments/payments gone; residents.property_id NULL |
| Delete resident | contacts, docs, payments, assignments CASCADE |
| Delete room/bed | assignments CASCADE — **audit trail lost** |

**Later:** RESTRICT delete on properties/rooms/beds with history; archive/soft-delete for residents. Not in this task.

---

## Demo data isolation

Identified by `organizations.slug = 'urbanstay-pg'` and demo emails. No `is_demo` flag.

Same-project multi-tenant **can** work for tables after RLS review. **Cannot** work for files until storage P0 is fixed.

---

## Migration readiness

Repo has:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_storage.sql
scripts/seed.ts
```

Missing: `supabase/config.toml`, CLI history, `seed.sql` in supabase folder.

Remote DB was applied via **SQL Editor**, so timestamps/names may not match `supabase migration list`.

**Safest baseline (later):** `supabase db pull` / `schema dump` into `001_baseline_existing_schema.sql`, mark as applied, never re-run 001–003 on production. Then only additive numbered migrations.

---

## SaaS readiness report sections (required)

### P0 security issues (before real customer data)

1. **Storage RLS** allows any authenticated user full access to `resident-documents`.
2. Property admins can read **other properties’** documents/contacts/deposits in the same org via table RLS (unacceptable once two managers from different PGs share an org — and worse if a second org user is ever mis-assigned). Cross-**organization** table RLS is mostly present; treat intra-org property leak as **P0 for shared-org managers**, **P1 if every org has one owner only**.

Recommend treating (1) as hard P0 and (2) as P0 before a multi-manager pilot.

### P1 MVP database changes

- Baseline migrations in CLI
- Tighten storage + property-scoped RLS (WITH CHECK)
- `search_path` on SECURITY DEFINER helpers
- Signup trigger or atomic server path (profile + org + owner role)
- Optional `organizations` status fields (not billing)
- Floor backfill strategy (nullable until backfilled)
- Stop CASCADE destroying bed_assignment history (RESTRICT)

### P2 improvements

- `rent_charges` ledger
- `organization_members` for multi-org users
- Billing/plan columns
- Soft-delete
- Leads/prospects
- `is_demo` on organizations
- Separate demo Supabase project

### Tables to keep

All 17 public tables listed in the product brief. None are redundant enough to drop.

### Tables to modify (later)

`organizations` (optional status), `profiles` (multi-org later), storage policies, possibly add `property_id` to documents/contacts/deposits for RLS, `rooms.floor_id` NOT NULL after backfill.

### Proposed new tables (later only)

- `rent_charges` — when invoicing is required
- `organization_members` — when a user must join two orgs
- `leads` — only if sales pipeline is in MVP (recommend **no**)

### Tables to remove

**None.** Do not drop `floors`.

---

## Proposed migration sequence (do not run now)

```text
001_baseline_existing_schema     -- dump/lock current prod schema
002_harden_security_definer      -- search_path on helper functions
003_harden_storage_rls           -- path-prefix org (+ property) policies
004_harden_table_rls             -- property scope + WITH CHECK
005_floor_backfill_optional      -- create default floors, attach rooms
006_delete_restrict_history      -- RESTRICT on beds/rooms with assignments
007_signup_org_bootstrap         -- trigger or RPC for new tenants
008_rent_charges                 -- after pilot if needed
009_organization_members         -- only if multi-org login is required
```

---

## Risk assessment (evolving the demo DB)

| Risk | Mitigation |
|------|------------|
| Re-running 001/002 on prod | Baseline instead; never re-apply CREATE TYPE |
| Storage policy change blocks uploads | Test with demo owner/manager first |
| Tightening contacts/docs RLS hides manager data | Backfill property_id or join via resident.property_id |
| Signup trigger doubles profiles | Idempotent insert |
| CASCADE deletes during tests | Use a staging clone before any delete-policy change |
| Demo + real customers same project | Flag demo org; later split projects |

**Verdict:** **Evolve** the existing database. Replacement is unnecessary and would destroy demo + learning. Do not host real KYC documents until P0 storage is fixed.

---

## Recommended SaaS architecture (target)

```text
User (auth.users)
  └── Organization (tenant)
        ├── Members (role: owner | property_admin | viewer)
        ├── Properties[]
        │     ├── Floors[]
        │     │     └── Rooms[]
        │     │           └── Beds[]
        │     ├── Residents[] (status + bed_assignments history)
        │     ├── Payments[] + future RentCharges[]
        │     ├── Deposits[]
        │     └── Documents (storage path org/property/resident/...)
        └── Audit / notifications
```

Isolation: RLS on every table by `organization_id` (and property assignment for non-owners). Storage policies must match path prefixes. Service role never in the browser.

---

## Files inspected

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_rls_policies.sql`
- `supabase/migrations/003_storage.sql`
- `scripts/seed.ts`
- `src/lib/auth/get-user.ts`
- `src/lib/supabase/{client,server,admin,middleware}.ts`
- `src/lib/actions/index.ts`
- `src/lib/queries/index.ts`
- `src/types/database.ts`
- `src/middleware.ts`
- `src/features/documents/upload-form.tsx`
- `src/app/api/documents/[id]/signed-url/route.ts`
- `src/app/api/beds/available/route.ts`
- `src/app/demo/route.ts`
- `.env.example`

No remote schema dump was taken (by design). If Dashboard objects differ from these files, re-audit after `pg_dump --schema-only`.
