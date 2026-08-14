# Supabase Setup Checklist

Complete these steps before running the app locally.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy **Project URL** and **anon public key** to `.env.local`
3. Copy **service_role key** (Settings → API) for seed script only

## 2. Run Database Migrations

In Supabase **SQL Editor**, run in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

## 3. Storage Setup

1. Go to **Storage** → Create bucket `resident-documents` (set to **Private**)
2. Run `supabase/migrations/003_storage.sql` in SQL Editor

## 4. Auth Configuration

1. **Authentication** → Providers → Enable Email
2. Disable public signups (optional, for demo)
3. **URL Configuration** → Add redirect URLs:
   - `http://localhost:3000/**`
   - `https://your-app.vercel.app/**` (after deploy)

## 5. Seed Demo Data

```bash
npm run seed
```

This creates:
- Organization: UrbanStay PG
- 3 properties, ~40 residents
- Demo users (password: `Demo@12345`):
  - `owner@demo-hostel.com`
  - `manager@demo-hostel.com`
  - `viewer@demo-hostel.com`

## 6. Vercel Deployment

1. Push repo to GitHub
2. Import in Vercel → Framework: Next.js
3. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (optional, for re-seeding)
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
4. Deploy and add Vercel URL to Supabase redirect URLs

## Demo Checklist

- [ ] Login works (owner + manager)
- [ ] Dashboard shows populated KPIs
- [ ] Property → room/bed view works
- [ ] Resident search works
- [ ] Onboarding wizard completes
- [ ] Payment recording updates dashboard
- [ ] Room transfer works
- [ ] Checkout releases bed
- [ ] Manager restricted to assigned property
- [ ] Mobile layout acceptable
