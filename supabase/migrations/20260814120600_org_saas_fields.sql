-- Lean SaaS fields. No billing.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

UPDATE public.organizations
SET is_demo = true
WHERE slug = 'urbanstay-pg';

-- Existing tenants (including demo) must not be forced through new onboarding.
UPDATE public.organizations
SET onboarding_completed_at = COALESCE(onboarding_completed_at, now())
WHERE onboarding_completed_at IS NULL;
