# Awaasly SaaS migration plan

**Branch:** `feat/awaasly-saas-foundation`  
**Base commit:** `951dbbf536afe46832c7c4377b8b6298c5bdad98`  
**Date:** 14 August 2026

## Before

- Hand-applied SQL in the Dashboard (`supabase/legacy/001–003`)
- Org-scoped tables with weak Storage RLS (any authenticated user, whole bucket)
- Property-admin leak of sibling-property contacts/documents/deposits
- No owner signup / org bootstrap / onboarding
- `rooms.floor_id` unused (no floor rows)
- Room/bed/property delete CASCADE wiped `bed_assignments` / `payments`

## After

- CLI-managed timestamped migrations; legacy SQL archived and must never re-run
- Path-based Storage RLS and property-derived table RLS
- `bootstrap_organization` RPC + `/signup` + `/onboarding`
- Floor backfill `Ground / Unassigned` (`floor_number = 0`)
- History FKs `ON DELETE RESTRICT` for assignments and payments→property
- `organizations.is_demo`, `onboarding_completed_at`

## Migration versions

| Version | File | Purpose |
|---------|------|---------|
| 20260814120000 | baseline_existing_production | Snapshot of legacy schema+RLS+storage. **Repair as applied on remote. Do not re-execute.** |
| 20260814120100 | harden_security_definer | Helpers: `search_path=''`, deterministic role |
| 20260814120200 | harden_storage_rls | P0 storage path isolation |
| 20260814120300 | harden_table_rls | Property-scoped policies + WITH CHECK |
| 20260814120400 | floor_backfill | Default floor per property, attach rooms |
| 20260814120500 | protect_history | RESTRICT on assignment/payment property FKs |
| 20260814120600 | org_saas_fields | `is_demo`, `onboarding_completed_at` |
| 20260814120700 | signup_org_bootstrap | `bootstrap_organization` RPC |

## Rollback

Prefer forward fixes. Do not run automatic down migrations on production.

| Migration | Reverse if absolutely required |
|-----------|--------------------------------|
| 201 helpers | Restore previous function bodies from `supabase/legacy/002_rls_policies.sql` |
| 202 storage | Recreate old bucket-wide policies (not recommended) |
| 203 table RLS | Recreate legacy policy names from 002 |
| 204 floors | Leave rows; do not delete rooms |
| 205 FKs | Recreate CASCADE (destroys history on delete again) |
| 206 columns | Leave columns; they are nullable/defaulted |
| 207 RPC | `DROP FUNCTION public.bootstrap_organization(text,text,text)` |

## Restore from backup

If `backups/pre-saas-migration/schema.sql` and `data.sql` exist (gitignored):

```bash
# Use a throwaway database or explicit operator approval — never db reset --linked
psql "$DATABASE_URL" -f backups/pre-saas-migration/schema.sql
psql "$DATABASE_URL" -f backups/pre-saas-migration/data.sql
```

## Production apply sequence

1. Backup dump succeeds  
2. `migration repair --status applied 20260814120000`  
3. Dry-run remaining migrations (no unexpected DROP TABLE/SCHEMA)  
4. `supabase db push --linked` for 201–207 only  
5. Smoke demo login + disposable signup  

## Production apply status (14 August 2026)

**BLOCKED — migrations were not applied to the linked production database.**

| Check | Result |
|-------|--------|
| Backup `supabase db dump --linked` | Failed — no `SUPABASE_ACCESS_TOKEN` / CLI session |
| Local `supabase start` | Failed — Docker/Podman not installed |
| Dry-run `db push --linked` | Not run (cannot distinguish a safe linked session) |
| `db reset --linked` | Never used |

**Safe next action:** Install Docker Desktop (for local migration tests) and log in with `supabase login`, then run the backup → repair baseline → dry-run → push sequence in the runbook. Do not re-apply `supabase/legacy` or the baseline file on production.

