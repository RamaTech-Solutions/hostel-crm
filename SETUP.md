# Local setup

Use the **staging** Supabase project (`pg-crm-demo`) for `.env.local`. Do not point local seed at production.

## 1. Environment file

```bash
cp .env.example .env.local
```

Set (values from the staging Dashboard → Settings → API; do not commit them):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (local seed/smoke only)
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `DEMO_OWNER_EMAIL` / `DEMO_OWNER_PASSWORD` (staging demo login)
- `NEXT_PUBLIC_PRIMARY_APP_URL` (production origin) so demo **Start Free** goes to production signup

Never put the service role or demo password in `NEXT_PUBLIC_*` or in Vercel Production.

## 2. Database

Checked-in history is `supabase/migrations/` (timestamped). Do **not** run `supabase/legacy/*.sql` in the SQL Editor against staging or production.

Local greenfield rehearsal (Docker):

```bash
npx supabase start
npx supabase db reset
```

Never `npx supabase db reset --linked`.

Remote apply (after printing the project ref):

```bash
npm run supabase:target
npx supabase db push --linked --dry-run
npx supabase db push --linked
```

## 3. Storage and Auth

Bucket `resident-documents` is private (migrations + `config.toml`). Auth Site URL for local: `http://localhost:3000`. Staging Site URL: the **stable** staging origin. Production Site URL: `https://hostel-crm.vercel.app`.

## 4. Seed (staging only)

Requires both:

```bash
ALLOW_DEMO_SEED=1 CONFIRM_SUPABASE_PROJECT_REF=<staging-project-ref> npm run seed
```

The script derives the ref from `NEXT_PUBLIC_SUPABASE_URL` and aborts on mismatch or if the ref equals `PRODUCTION_SUPABASE_PROJECT_REF`. It does not print passwords.

## 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000 — **Explore Demo** uses `/demo` unless `NEXT_PUBLIC_DEMO_URL` is set.

## 6. Vercel

Set Preview vs Production variables per [docs/AWAASLY_DEPLOYMENT_RUNBOOK.md](docs/AWAASLY_DEPLOYMENT_RUNBOOK.md). Production must not include `DEMO_OWNER_*` or `SUPABASE_SERVICE_ROLE_KEY`. Production must set `NEXT_PUBLIC_DEMO_URL` to the stable staging `/demo`.
