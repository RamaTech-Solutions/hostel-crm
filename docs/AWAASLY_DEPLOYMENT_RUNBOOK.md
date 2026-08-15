# Awaasly deployment runbook

## Vercel environment variables (names only)

Required (already used):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` — production site URL, e.g. `https://hostel-crm.vercel.app` (Auth email redirects)
- `DEMO_OWNER_EMAIL`
- `DEMO_OWNER_PASSWORD`

Optional / local seed only (do **not** add to the browser):

- `SUPABASE_SERVICE_ROLE_KEY`

Supabase Auth URL config (Dashboard, not Vercel):

- Site URL = production origin
- Redirect allow list includes `https://hostel-crm.vercel.app/auth/callback` and local `http://localhost:3000/auth/callback`

## Git

Base SHA: `951dbbf536afe46832c7c4377b8b6298c5bdad98`  
Branch: `feat/awaasly-saas-foundation`

Deploy by merging/pushing this branch so Vercel builds `main` or the preview.

## Database apply (linked project only)

Never run `supabase db reset --linked`.

Never re-apply `supabase/legacy/*.sql` or `20260814120000_baseline_existing_production.sql` on production.

```bash
# 1. Backup (gitignored)
mkdir -p backups/pre-saas-migration
supabase db dump --linked -f backups/pre-saas-migration/schema.sql
supabase db dump --linked --data-only -f backups/pre-saas-migration/data.sql

# 2. Mark baseline applied if remote already has the demo schema
supabase migration repair --status applied 20260814120000 --linked

# 3. Dry-run
supabase db push --linked --dry-run

# 4. Apply 201–207 if dry-run has no unexpected DROP TABLE/SCHEMA/TYPE/TRUNCATE
supabase db push --linked
```

## STOP

Do not apply if backup fails, history cannot be reconciled, dry-run drops unexpected objects, or you cannot tell local vs linked.

## Smoke

1. `/demo` still opens the UrbanStay dashboard  
2. `/login` for manager and viewer  
3. Manager cannot open another property’s residents  
4. Disposable `/signup` cannot see demo residents  
5. Document files stream from `/api/documents/[id]/content` (path `org/resident/document.ext`)

## Local

Docker Desktop must be running. If `docker` is not on PATH, use:

```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
export DOCKER_HOST=unix://$HOME/.docker/run/docker.sock
```

`supabase db lint --linked` was used against production after apply (no schema errors). `supabase start` is optional for a full local stack.

## Smoke after apply

```bash
npx tsx scripts/smoke-rls.ts
```

Expected: demo owner/manager/viewer login, property isolation, viewer write blocked, disposable tenant cannot see demo rows.

