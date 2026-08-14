# PG Management CRM

Multi-property Hostel / PG Management demo built with Next.js 15, Supabase, and Tailwind CSS.

## Quick Start (Localhost)

### 1. Install dependencies

```bash
cd pg-crm
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env.local` and fill in your keys
3. Run migrations in Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
4. Create Storage bucket `resident-documents` (private)
5. Add Auth redirect URLs: `http://localhost:3000/**`

### 3. Seed demo data

```bash
npm run seed
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo login:** `owner@demo-hostel.com` / `Demo@12345`

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Set environment variables (same as `.env.local`)
4. Add production URL to Supabase Auth redirect URLs

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run seed` | Seed demo data |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run Playwright E2E |

## Architecture

- **Frontend:** Next.js 15 App Router, TypeScript, Tailwind, shadcn-style UI
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Auth:** Email/password via Supabase Auth with middleware session refresh

## Roles

| Role | Access |
|------|--------|
| Owner | All properties, full CRUD, team management |
| Property Admin | Assigned properties only |
| Viewer | Read-only on assigned properties |
