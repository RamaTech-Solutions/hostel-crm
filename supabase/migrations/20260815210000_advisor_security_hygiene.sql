-- Advisor hygiene: pin search_path on updated_at trigger; lock demo identity
-- trigger to Auth-internal execute only. Do not revoke authenticated on
-- intentional business RPCs or RLS helpers.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_demo_auth_identity() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT EXECUTE ON FUNCTION public.protect_demo_auth_identity() TO postgres;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    GRANT EXECUTE ON FUNCTION public.protect_demo_auth_identity() TO supabase_auth_admin;
  END IF;
END $$;
