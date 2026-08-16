# Awaasly deployment runbook

## Environment split (Sprint 8.1)

| Environment | Supabase | Demo login | Public conversion |
|---|---|---|---|
| Local | Staging (`pg-crm-demo`) | Yes | `NEXT_PUBLIC_PRIMARY_APP_URL`/signup when set |
| Vercel Preview | Staging | Yes | Same |
| Vercel Production | **New empty production project** | No (`DEMO_OWNER_*` omitted) | `/signup` on this host |

Do not copy staging rows into production. Never `supabase db reset --linked`. Never put `SUPABASE_SERVICE_ROLE_KEY` on Vercel or as `NEXT_PUBLIC_*`.

### Public journey

Production landing **Explore Demo** → `NEXT_PUBLIC_DEMO_URL` (stable staging `/demo`) → staging Supabase.

Staging demo **Start Free** → `NEXT_PUBLIC_PRIMARY_APP_URL/signup` → production Supabase.

## Environment variable names

See [`.env.example`](../.env.example). Scopes:

- **Preview / Development:** staging `NEXT_PUBLIC_SUPABASE_URL` + anon; `NEXT_PUBLIC_APP_URL` = **stable staging origin** (never the production hostname); `DEMO_OWNER_EMAIL` / `DEMO_OWNER_PASSWORD`; `NEXT_PUBLIC_PRIMARY_APP_URL` = production origin. No service role.
- **Production:** production URL + anon; `NEXT_PUBLIC_APP_URL` = `https://hostel-crm.vercel.app`; `NEXT_PUBLIC_DEMO_URL` = `https://<stable-staging>/demo`. Omit demo email/password and service role.

`getAppUrl()` does not fall back to `https://hostel-crm.vercel.app`. Set `NEXT_PUBLIC_APP_URL` on every deploy.

## Stable staging origin

Preferred: a dedicated Git branch named `staging` (not a one-off Preview hash).

In Vercel (manual):

1. Create and push branch `staging` from the release branch.
2. Project → Settings → Environments: add **Staging** (or assign Preview) to branch `staging`.
3. Project → Settings → Domains: give that branch a **stable** hostname (do not copy a random `*-git-*-commit*.vercel.app` Preview URL).
4. Use that origin as Staging Auth Site URL, Preview `NEXT_PUBLIC_APP_URL`, and Production `NEXT_PUBLIC_DEMO_URL` (`…/demo`).

Also allowlist `http://localhost:3000/auth/callback` and extra Preview callbacks if needed.

Do not invent the hostname. Record it in this runbook after it exists.

## Identify the CLI target (project ref)

Before any remote mutation:

```bash
npx supabase projects list
npm run supabase:target
# also: cat supabase/.temp/project-ref   # gitignored; present with current CLI
npx supabase db push --linked --dry-run
```

Proceed only if the printed **project ref** is the intended staging or production project. Do not assume `linked-project.json`.

## Greenfield migration rehearsal (required before new production)

Local Docker only — not linked remote:

```bash
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
export DOCKER_HOST=unix://$HOME/.docker/run/docker.sock
npx supabase start
npx supabase db reset
```

If the full `supabase/migrations/` chain fails, **stop**. Do not edit historical migrations. Add a new forward migration only after reporting the defect.

If local Supabase cannot run, do not initialize production; report rehearsal incomplete.

**Rehearsal status (2026-08-15):** Docker Desktop available. `npx supabase start` then `npx supabase db reset` (not `--linked`) replayed the full checked-in chain through `20260815200000_demo_write_protection.sql`. CLI also ran `supabase/seed.sql` (comments only — not UrbanStay). Remote production is still uninitialized until you create the empty project. Advisor hygiene is `20260815210000_advisor_security_hygiene.sql` (local reset + `npm run smoke:auth-identity` before any linked push).

## Production initialization

After rehearsal succeeds, create an empty **Awaasly Production** project by hand.

1. Confirm project ref (`npm run supabase:target` after `supabase link`)
2. `npx supabase db push --linked --dry-run`
3. Apply if the dry-run is expected
4. Do **not** seed, copy UrbanStay/residents/payments/documents/auth users, run `supabase/legacy/*.sql`, or `migration repair` on a truly empty project

Read-only check: no customer orgs, residents, payments, rent charges, documents, or Storage objects. Then one real `/signup` on production.

## Staging demo seed

Staging only. Both flags required. Aborts if the URL ref is production.

```bash
ALLOW_DEMO_SEED=1 CONFIRM_SUPABASE_PROJECT_REF=<staging-ref> npm run seed
```

Set `PRODUCTION_SUPABASE_PROJECT_REF` in `.env.local` once production exists so seed cannot hit it even with `ALLOW_DEMO_SEED=1`.

## Release sequence

1. `npm test`
2. `npm run lint`
3. `npm run build`
4. `npm run smoke:auth-identity` against **local** Supabase (required after Auth trigger/grant changes)
5. `npm run supabase:target` — confirm ref
6. `npx supabase db push --linked --dry-run` then apply if correct
7. Deploy Production (production env vars)
8. Smoke: production signup; Explore Demo opens staging; staging Start Free opens production `/signup`
9. No seeds on production

Enable leaked-password protection on Production Auth when the plan supports it. See [AWAASLY_PRODUCTION_HARDENING.md](./AWAASLY_PRODUCTION_HARDENING.md).

## Dependency HIGH findings (do not force-upgrade)

`npm audit` reports 3 high in Next-bundled `postcss` and `sharp`. `npm audit fix --force` would install Next 16. **Do not run it in 8.1.** Revisit at the final pre-pilot gate. See [AWAASLY_PRODUCTION_HARDENING.md](./AWAASLY_PRODUCTION_HARDENING.md).

## Smoke

1. Staging `/demo` opens UrbanStay (read-only writes)
2. Staging Start Free lands on production `/signup`
3. Production Explore Demo opens stable staging `/demo`
4. Production `/demo` without demo env does not sign in
5. Disposable production signup cannot see staging residents
