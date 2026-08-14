-- Harden SECURITY DEFINER helpers: empty search_path, qualified names,
-- deterministic role, execute only for authenticated.

CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  INNER JOIN public.profiles p
    ON p.id = ur.user_id
   AND p.organization_id = ur.organization_id
  WHERE ur.user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_user_property_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pr.id
  FROM public.properties pr
  WHERE pr.organization_id = public.get_user_organization_id()
    AND (
      public.get_user_role() = 'owner'
      OR pr.id IN (
        SELECT pua.property_id
        FROM public.property_user_assignments pua
        WHERE pua.user_id = auth.uid()
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.can_user_write()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_user_role() IN ('owner', 'property_admin')
$$;

CREATE OR REPLACE FUNCTION public.can_access_resident(p_resident_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.residents r
    WHERE r.id = p_resident_id
      AND r.organization_id = public.get_user_organization_id()
      AND (
        r.property_id IN (SELECT public.get_user_property_ids())
        OR (r.property_id IS NULL AND public.get_user_role() = 'owner')
      )
  )
$$;

REVOKE ALL ON FUNCTION public.get_user_organization_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_property_ids() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_user_write() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_resident(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_property_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_write() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_resident(uuid) TO authenticated;
