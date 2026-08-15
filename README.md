# Awaasly

PG and hostel operations for owners — Next.js 15, Supabase, and Tailwind CSS. A product of Ramatech Innovation Pvt Ltd.

## Quick start

```bash
cd pg-crm
npm install
cp .env.example .env.local
```

Fill Supabase keys in `.env.local`. Database changes are in `supabase/migrations/` (CLI). Do not re-run `supabase/legacy/` on production.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public landing page.

## Main routes

| Path | Who |
|------|-----|
| `/` | Public Awaasly site |
| `/signup` | New owner |
| `/login` | Existing users |
| `/demo` | One-click demo (no credentials on the page) |
| `/onboarding` | New owners until setup is complete |
| `/dashboard` | Signed-in operations |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run seed` | Staging demo seed (requires ALLOW_DEMO_SEED + CONFIRM_SUPABASE_PROJECT_REF) |
| `npm run supabase:target` | Print configured Supabase host and project ref |
| `npm test` | Unit tests |
| `npm run smoke:rls` | Live tenant-isolation smoke |
| `npm run test:e2e` | Playwright |

## Roles

| Role | Access |
|------|--------|
| Owner | All properties in their organization |
| Property Admin | Assigned properties only |
| Viewer | Read-only on assigned properties |
