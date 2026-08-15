# Awaasly authentication flow

Email/password via Supabase Auth and `@supabase/ssr` cookies. Google Sign-In is deferred until `awaasly.ramatech.co.in`.

## Signup

`/signup` → `signUp` with `emailRedirectTo` `/auth/callback?next=/onboarding`.

Password policy (UI + schema): 8+ characters, uppercase, lowercase, number, special character. Confirm password must match.

If confirmation is required, the user sees `/signup/check-email` and can resend the confirmation email.

## Confirmation

The email link hits `/auth/callback`, which exchanges the PKCE `code` for a session, then `/onboarding`. `bootstrap_organization` creates the organization, profile, and owner role once for `auth.uid()`.

## Login

`/login` → `signInWithPassword`. Ready users go to `/dashboard` (or a safe `next=` path). Incomplete owners are sent to `/onboarding` by middleware. Managers/viewers never enter owner onboarding.

Unconfirmed users see: `Please confirm your email before signing in.` plus Resend confirmation.

## Forgot password

`/login` → Forgot password? → `/forgot-password` → `resetPasswordForEmail`.

Always show a neutral success message. Do not reveal whether the email exists.

Redirect: `/auth/callback?next=/reset-password`.

## Reset password

Valid recovery session → `/reset-password` with the same password checklist → `updateUser({ password })` → Continue to Awaasly (`/dashboard`, then tenant gate).

Invalid/expired/missing session → request a new reset link. Middleware does not bounce this page to onboarding or dashboard.

## Session expiry

Protected routes without a user redirect to `/login?next=…`. If auth cookies were present, `error=session` shows: `Your session has expired. Please sign in again.`

## Demo

`GET /demo` signs in the seeded owner server-side. Password policy is not applied to demo login.

## Deferred

Google Sign-In — deferred until `awaasly.ramatech.co.in`.
