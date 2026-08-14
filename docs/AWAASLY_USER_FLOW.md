# Awaasly user flow

## Visitor

`/` is the public product site. Start Free → `/signup`. Explore Demo → `/demo`. Login → `/login`.

## Signup

`/signup` creates a Supabase Auth user (email/password). Metadata stores name, business name, and phone.

If email confirmation is on, `/signup/check-email` is shown. The confirmation link hits `/auth/callback?next=/onboarding`.

`bootstrap_organization` then creates the organization, profile, and owner role for `auth.uid()`.

## Owner onboarding

`/onboarding` (owners only, until `organizations.onboarding_completed_at` is set):

1. Business details
2. First property (required)
3. Floors
4. Rooms and beds (optional skip)
5. Complete → dashboard or add resident

Resume is derived from data: no org → business; no property → property; no floors → structure; else rooms/complete. Logging out does not create a second organization or property.

## Login

Existing owners with completed onboarding go to `/dashboard`. Incomplete owners return to `/onboarding`.

## Manager / viewer

`property_admin` and `viewer` never enter owner onboarding. They go to the dashboard for assigned properties.

## Demo

`/demo` signs in the seeded UrbanStay owner. A banner offers Create Your Own Workspace (signs out, then `/signup`). Demo data stays in the demo organization.

## Dashboard activation

A new owner with a property and zero residents sees a short checklist and Add your first resident (`/residents/new`).
