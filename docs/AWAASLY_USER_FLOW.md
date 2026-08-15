# Awaasly user flow

## Visitor

`/` is the public product site. Start Free → `/signup`. Explore Demo → `/demo`. Login → `/login`.

## Signup

`/signup` creates a Supabase Auth user (email/password). Metadata stores name, business name, and phone.

If email confirmation is on, `/signup/check-email` is shown. The confirmation link hits `/auth/callback?next=/onboarding`.

`bootstrap_organization` then creates the organization, profile, and owner role for `auth.uid()`.

## Owner onboarding

`/onboarding` (owners only, until `organizations.onboarding_completed_at` is set):

1. Welcome — owner/business details, then Start Setup
2. First property (create once, later visits update that same property)
3. Floors — generate from count, then Add Floor / Rename (count is not silently reduced)
4. Rooms & beds — add a compact list; Continue requires at least one room; Skip for now is explicit
5. Finish — server counts, then Go to Dashboard (`/dashboard`) or Add First Resident (`/residents/new`)

Progress is persisted in the database at each step. Resume: no org → welcome; no property → property; no floors → floors; otherwise rooms. Logging out does not create a second organization or property.

Skipped rooms: onboarding can complete, but Finish and the dashboard checklist say rooms are incomplete and link to `/rooms`.

After onboarding, owners and property admins manage additional properties, floors, rooms and beds from `/properties` and `/rooms`. Occupancy is based on active bed assignments. See [AWAASLY_INVENTORY.md](./AWAASLY_INVENTORY.md).

Property type is still stored in `properties.notes` (technical debt). Room numbers are unique per property.

## Login

Existing owners with completed onboarding go to `/dashboard`. Incomplete owners return to `/onboarding`. `Forgot password?` on `/login` opens `/forgot-password`. A valid reset email lands on `/reset-password` after `/auth/callback`.

## Manager / viewer

`property_admin` and `viewer` never enter owner onboarding. They go to the dashboard for assigned properties.

## Demo

`/demo` signs in the seeded UrbanStay owner. A banner offers Create Your Own Workspace (signs out, then `/signup`). Demo data stays in the demo organization.

## Dashboard activation

A new owner with a property and zero residents sees a short checklist. If rooms were skipped, the CTA is Add Rooms & Beds (`/rooms`). Otherwise Add your first resident (`/residents/new`).
