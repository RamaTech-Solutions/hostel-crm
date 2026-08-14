-- INSERT ... RETURNING failed because properties_select required
-- id IN (SELECT get_user_property_ids()), and that subquery cannot see the
-- row being inserted. Owners must be allowed by org + role instead.

DROP POLICY IF EXISTS "properties_select" ON public.properties;

CREATE POLICY "properties_select" ON public.properties
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (
      public.get_user_role() = 'owner'
      OR id IN (
        SELECT pua.property_id
        FROM public.property_user_assignments pua
        WHERE pua.user_id = auth.uid()
      )
    )
  );
