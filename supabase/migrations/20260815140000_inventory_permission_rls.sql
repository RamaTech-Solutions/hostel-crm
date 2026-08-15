-- Sprint 3: match declared permission matrix without a broad RLS redesign.
-- properties INSERT/DELETE were already owner-only.
-- properties UPDATE previously used can_user_write() (owner OR property_admin),
-- which would let a property_admin archive or edit metadata via PostgREST.
-- floors writes previously used can_user_write(); structural floor admin is owner-only.
-- rooms/beds remain can_user_write() on assigned properties (operational inventory).

DROP POLICY IF EXISTS "properties_update" ON public.properties;
CREATE POLICY "properties_update" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND id IN (SELECT public.get_user_property_ids())
    AND public.get_user_role() = 'owner'
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND id IN (SELECT public.get_user_property_ids())
    AND public.get_user_role() = 'owner'
  );

DROP POLICY IF EXISTS "floors_insert" ON public.floors;
CREATE POLICY "floors_insert" ON public.floors
  FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.get_user_property_ids())
    AND public.get_user_role() = 'owner'
  );

DROP POLICY IF EXISTS "floors_update" ON public.floors;
CREATE POLICY "floors_update" ON public.floors
  FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.get_user_property_ids())
    AND public.get_user_role() = 'owner'
  )
  WITH CHECK (
    property_id IN (SELECT public.get_user_property_ids())
    AND public.get_user_role() = 'owner'
  );

DROP POLICY IF EXISTS "floors_delete" ON public.floors;
CREATE POLICY "floors_delete" ON public.floors
  FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.get_user_property_ids())
    AND public.get_user_role() = 'owner'
  );
