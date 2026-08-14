-- Property-scoped RLS. Owners see all org properties via get_user_property_ids().
-- Explicit USING + WITH CHECK on writes. Viewers cannot write.

-- Organizations
DROP POLICY IF EXISTS "org_select" ON public.organizations;
DROP POLICY IF EXISTS "org_update" ON public.organizations;

CREATE POLICY "org_select" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_user_organization_id());

CREATE POLICY "org_update" ON public.organizations
  FOR UPDATE TO authenticated
  USING (id = public.get_user_organization_id() AND public.get_user_role() = 'owner')
  WITH CHECK (id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND organization_id = public.get_user_organization_id());

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'owner'
  );

-- User roles
DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner')
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

-- Properties
DROP POLICY IF EXISTS "properties_select" ON public.properties;
DROP POLICY IF EXISTS "properties_insert" ON public.properties;
DROP POLICY IF EXISTS "properties_update" ON public.properties;
DROP POLICY IF EXISTS "properties_delete" ON public.properties;

CREATE POLICY "properties_select" ON public.properties
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_user_property_ids()));

CREATE POLICY "properties_insert" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

CREATE POLICY "properties_update" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND id IN (SELECT public.get_user_property_ids())
    AND public.can_user_write()
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND id IN (SELECT public.get_user_property_ids())
  );

CREATE POLICY "properties_delete" ON public.properties
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

-- Property user assignments
DROP POLICY IF EXISTS "pua_select" ON public.property_user_assignments;
DROP POLICY IF EXISTS "pua_manage" ON public.property_user_assignments;

CREATE POLICY "pua_select" ON public.property_user_assignments
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "pua_insert" ON public.property_user_assignments
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

CREATE POLICY "pua_update" ON public.property_user_assignments
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner')
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

CREATE POLICY "pua_delete" ON public.property_user_assignments
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

-- Floors / rooms / beds
DROP POLICY IF EXISTS "floors_select" ON public.floors;
DROP POLICY IF EXISTS "floors_write" ON public.floors;
DROP POLICY IF EXISTS "rooms_select" ON public.rooms;
DROP POLICY IF EXISTS "rooms_write" ON public.rooms;
DROP POLICY IF EXISTS "beds_select" ON public.beds;
DROP POLICY IF EXISTS "beds_write" ON public.beds;

CREATE POLICY "floors_select" ON public.floors
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()));

CREATE POLICY "floors_insert" ON public.floors
  FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "floors_update" ON public.floors
  FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write())
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "floors_delete" ON public.floors
  FOR DELETE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "rooms_select" ON public.rooms
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()));

CREATE POLICY "rooms_insert" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "rooms_update" ON public.rooms
  FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write())
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "rooms_delete" ON public.rooms
  FOR DELETE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "beds_select" ON public.beds
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()));

CREATE POLICY "beds_insert" ON public.beds
  FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "beds_update" ON public.beds
  FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write())
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "beds_delete" ON public.beds
  FOR DELETE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

-- Residents: unassigned property_id is owner-only
DROP POLICY IF EXISTS "residents_select" ON public.residents;
DROP POLICY IF EXISTS "residents_write" ON public.residents;

CREATE POLICY "residents_select" ON public.residents
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (
      property_id IN (SELECT public.get_user_property_ids())
      OR (property_id IS NULL AND public.get_user_role() = 'owner')
    )
  );

CREATE POLICY "residents_insert" ON public.residents
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_user_write()
    AND (
      property_id IN (SELECT public.get_user_property_ids())
      OR (property_id IS NULL AND public.get_user_role() = 'owner')
    )
  );

CREATE POLICY "residents_update" ON public.residents
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_user_write()
    AND (
      property_id IN (SELECT public.get_user_property_ids())
      OR (property_id IS NULL AND public.get_user_role() = 'owner')
    )
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND (
      property_id IN (SELECT public.get_user_property_ids())
      OR (property_id IS NULL AND public.get_user_role() = 'owner')
    )
  );

CREATE POLICY "residents_delete" ON public.residents
  FOR DELETE TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.can_user_write()
    AND (
      property_id IN (SELECT public.get_user_property_ids())
      OR (property_id IS NULL AND public.get_user_role() = 'owner')
    )
  );

-- Bed assignments
DROP POLICY IF EXISTS "bed_assignments_select" ON public.bed_assignments;
DROP POLICY IF EXISTS "bed_assignments_write" ON public.bed_assignments;

CREATE POLICY "bed_assignments_select" ON public.bed_assignments
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()));

CREATE POLICY "bed_assignments_insert" ON public.bed_assignments
  FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "bed_assignments_update" ON public.bed_assignments
  FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write())
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "bed_assignments_delete" ON public.bed_assignments
  FOR DELETE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

-- Contacts / documents / deposits / transfers via resident.property_id
DROP POLICY IF EXISTS "resident_contacts_select" ON public.resident_contacts;
DROP POLICY IF EXISTS "resident_contacts_write" ON public.resident_contacts;

CREATE POLICY "resident_contacts_select" ON public.resident_contacts
  FOR SELECT TO authenticated
  USING (public.can_access_resident(resident_id));

CREATE POLICY "resident_contacts_insert" ON public.resident_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_user_write()
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "resident_contacts_update" ON public.resident_contacts
  FOR UPDATE TO authenticated
  USING (public.can_user_write() AND public.can_access_resident(resident_id))
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "resident_contacts_delete" ON public.resident_contacts
  FOR DELETE TO authenticated
  USING (public.can_user_write() AND public.can_access_resident(resident_id));

DROP POLICY IF EXISTS "resident_documents_select" ON public.resident_documents;
DROP POLICY IF EXISTS "resident_documents_write" ON public.resident_documents;

CREATE POLICY "resident_documents_select" ON public.resident_documents
  FOR SELECT TO authenticated
  USING (public.can_access_resident(resident_id));

CREATE POLICY "resident_documents_insert" ON public.resident_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_user_write()
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "resident_documents_update" ON public.resident_documents
  FOR UPDATE TO authenticated
  USING (public.can_user_write() AND public.can_access_resident(resident_id))
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "resident_documents_delete" ON public.resident_documents
  FOR DELETE TO authenticated
  USING (public.can_user_write() AND public.can_access_resident(resident_id));

DROP POLICY IF EXISTS "security_deposits_select" ON public.security_deposits;
DROP POLICY IF EXISTS "security_deposits_write" ON public.security_deposits;

CREATE POLICY "security_deposits_select" ON public.security_deposits
  FOR SELECT TO authenticated
  USING (public.can_access_resident(resident_id));

CREATE POLICY "security_deposits_insert" ON public.security_deposits
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_user_write()
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "security_deposits_update" ON public.security_deposits
  FOR UPDATE TO authenticated
  USING (public.can_user_write() AND public.can_access_resident(resident_id))
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_access_resident(resident_id)
  );

CREATE POLICY "security_deposits_delete" ON public.security_deposits
  FOR DELETE TO authenticated
  USING (public.can_user_write() AND public.can_access_resident(resident_id));

DROP POLICY IF EXISTS "room_transfers_select" ON public.room_transfers;
DROP POLICY IF EXISTS "room_transfers_write" ON public.room_transfers;

CREATE POLICY "room_transfers_select" ON public.room_transfers
  FOR SELECT TO authenticated
  USING (public.can_access_resident(resident_id));

CREATE POLICY "room_transfers_insert" ON public.room_transfers
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.can_user_write()
    AND public.can_access_resident(resident_id)
  );

-- Payments
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_write" ON public.payments;

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()));

CREATE POLICY "payments_insert" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "payments_update" ON public.payments
  FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write())
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

CREATE POLICY "payments_delete" ON public.payments
  FOR DELETE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

-- Activity logs: owners see org-wide; others only their own rows
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;

CREATE POLICY "activity_logs_select" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (public.get_user_role() = 'owner' OR user_id = auth.uid())
  );

CREATE POLICY "activity_logs_insert" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());

-- Notifications
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND (user_id IS NULL OR user_id = auth.uid())
    AND (property_id IS NULL OR property_id IN (SELECT public.get_user_property_ids()))
  );

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND (property_id IS NULL OR property_id IN (SELECT public.get_user_property_ids()))
  );

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.get_user_role() = 'owner')
  WITH CHECK (organization_id = public.get_user_organization_id());
