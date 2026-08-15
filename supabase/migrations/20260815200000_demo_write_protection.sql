-- Sprint 8: demo org cannot persist business mutations. Owner-only writes use can_user_own().
-- Auth identity for demo users cannot change email/password/metadata.

CREATE OR REPLACE FUNCTION public.can_mutate_tenant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT NOT o.is_demo
      FROM public.organizations o
      WHERE o.id = public.get_user_organization_id()
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.can_user_write()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_user_role() IN ('owner', 'property_admin')
    AND public.can_mutate_tenant();
$$;

CREATE OR REPLACE FUNCTION public.can_user_own()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_user_role() = 'owner'
    AND public.can_mutate_tenant();
$$;

REVOKE ALL ON FUNCTION public.can_mutate_tenant() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_user_own() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_mutate_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_own() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_write() TO authenticated;

-- Owner-only mutating policies
DROP POLICY IF EXISTS "org_update" ON public.organizations;
CREATE POLICY "org_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.get_user_organization_id() AND public.can_user_own())
  WITH CHECK (id = public.get_user_organization_id() AND public.can_user_own());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND public.can_mutate_tenant())
  WITH CHECK (id = auth.uid() AND organization_id = public.get_user_organization_id() AND public.can_mutate_tenant());

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_user_own()
  );

DROP POLICY IF EXISTS "user_roles_insert" ON public.user_roles;
CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_user_own());

DROP POLICY IF EXISTS "user_roles_update" ON public.user_roles;
CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.can_user_own())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_user_own());

DROP POLICY IF EXISTS "user_roles_delete" ON public.user_roles;
CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.can_user_own());

DROP POLICY IF EXISTS "properties_insert" ON public.properties;
CREATE POLICY "properties_insert" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_user_own());

DROP POLICY IF EXISTS "properties_update" ON public.properties;
CREATE POLICY "properties_update" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND id IN (SELECT public.get_user_property_ids())
    AND public.can_user_own()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND id IN (SELECT public.get_user_property_ids())
    AND public.can_user_own()
  );

DROP POLICY IF EXISTS "properties_delete" ON public.properties;
CREATE POLICY "properties_delete" ON public.properties
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.can_user_own());

DROP POLICY IF EXISTS "pua_insert" ON public.property_user_assignments;
CREATE POLICY "pua_insert" ON public.property_user_assignments
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_user_own());

DROP POLICY IF EXISTS "pua_update" ON public.property_user_assignments;
CREATE POLICY "pua_update" ON public.property_user_assignments
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.can_user_own())
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_user_own());

DROP POLICY IF EXISTS "pua_delete" ON public.property_user_assignments;
CREATE POLICY "pua_delete" ON public.property_user_assignments
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.can_user_own());

DROP POLICY IF EXISTS "floors_insert" ON public.floors;
CREATE POLICY "floors_insert" ON public.floors
  FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_own());

DROP POLICY IF EXISTS "floors_update" ON public.floors;
CREATE POLICY "floors_update" ON public.floors
  FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_own())
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_own());

DROP POLICY IF EXISTS "floors_delete" ON public.floors;
CREATE POLICY "floors_delete" ON public.floors
  FOR DELETE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_own());

DROP POLICY IF EXISTS "rent_charges_update" ON public.rent_charges;
CREATE POLICY "rent_charges_update" ON public.rent_charges
  FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_own())
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_own());

DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
CREATE POLICY "activity_logs_insert" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_mutate_tenant()
    AND (public.get_user_role() = 'owner' OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_user_own());

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_mutate_tenant()
    AND (user_id = auth.uid() OR public.can_user_own())
  )
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.can_mutate_tenant());

CREATE OR REPLACE FUNCTION public.void_rent_charge(p_charge_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_charge public.rent_charges%ROWTYPE;
  v_paid numeric(10,2);
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_user_own() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only the owner can cancel an unpaid rent charge.');
  END IF;

  SELECT * INTO v_charge FROM public.rent_charges c WHERE c.id = p_charge_id AND c.organization_id = public.get_user_organization_id();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That rent charge was not found.');
  END IF;
  IF v_charge.voided_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'charge_id', v_charge.id, 'already_voided', true);
  END IF;
  IF v_charge.property_id NOT IN (SELECT public.get_user_property_ids()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;

  SELECT COALESCE(SUM(p.amount), 0) INTO v_paid
  FROM public.payments p
  WHERE p.rent_charge_id = v_charge.id
    AND p.payment_type = 'rent'
    AND p.status IN ('paid', 'partial');
  IF v_paid > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A charge with payments cannot be cancelled.');
  END IF;

  UPDATE public.rent_charges
  SET voided_at = now(), voided_by = auth.uid(), void_reason = NULLIF(p_reason, '')
  WHERE id = v_charge.id;

  RETURN jsonb_build_object('ok', true, 'charge_id', v_charge.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_org_rent_due_day(p_due_day integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_user_own() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only the owner can change the rent due day.');
  END IF;
  IF p_due_day IS NULL OR p_due_day < 1 OR p_due_day > 28 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rent due day must be between 1 and 28.');
  END IF;
  UPDATE public.organizations
  SET rent_due_day = p_due_day::smallint
  WHERE id = public.get_user_organization_id();
  RETURN jsonb_build_object('ok', true, 'rent_due_day', p_due_day);
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_demo_auth_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_demo boolean;
BEGIN
  SELECT COALESCE(o.is_demo, false) INTO v_demo
  FROM public.profiles p
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE p.id = OLD.id;

  IF COALESCE(v_demo, false) THEN
    IF NEW.email IS DISTINCT FROM OLD.email
       OR NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password
       OR NEW.phone IS DISTINCT FROM OLD.phone
       OR NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data
       OR NEW.raw_app_meta_data IS DISTINCT FROM OLD.raw_app_meta_data
       OR COALESCE(NEW.email_change, '') IS DISTINCT FROM COALESCE(OLD.email_change, '')
       OR COALESCE(NEW.phone_change, '') IS DISTINCT FROM COALESCE(OLD.phone_change, '')
       OR NEW.banned_until IS DISTINCT FROM OLD.banned_until
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    THEN
      RAISE EXCEPTION 'Demo account cannot be modified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_demo_auth_identity ON auth.users;
CREATE TRIGGER protect_demo_auth_identity
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_demo_auth_identity();
