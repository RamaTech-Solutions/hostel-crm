-- RLS Helper Functions and Policies

-- Helper: get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get property IDs user can access
CREATE OR REPLACE FUNCTION get_user_property_ids()
RETURNS SETOF UUID AS $$
  SELECT id FROM properties
  WHERE organization_id = get_user_organization_id()
    AND (
      get_user_role() = 'owner'
      OR id IN (
        SELECT property_id FROM property_user_assignments
        WHERE user_id = auth.uid()
      )
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: can user write
CREATE OR REPLACE FUNCTION can_user_write()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('owner', 'property_admin')
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Organizations
CREATE POLICY "org_select" ON organizations FOR SELECT
  USING (id = get_user_organization_id());

CREATE POLICY "org_update" ON organizations FOR UPDATE
  USING (id = get_user_organization_id() AND get_user_role() = 'owner');

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND get_user_role() = 'owner');

-- User Roles
CREATE POLICY "user_roles_select" ON user_roles FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "user_roles_manage" ON user_roles FOR ALL
  USING (organization_id = get_user_organization_id() AND get_user_role() = 'owner');

-- Properties
CREATE POLICY "properties_select" ON properties FOR SELECT
  USING (id IN (SELECT get_user_property_ids()));

CREATE POLICY "properties_insert" ON properties FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND get_user_role() = 'owner');

CREATE POLICY "properties_update" ON properties FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
    AND (get_user_role() = 'owner' OR id IN (SELECT get_user_property_ids()))
    AND can_user_write()
  );

CREATE POLICY "properties_delete" ON properties FOR DELETE
  USING (organization_id = get_user_organization_id() AND get_user_role() = 'owner');

-- Property User Assignments
CREATE POLICY "pua_select" ON property_user_assignments FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "pua_manage" ON property_user_assignments FOR ALL
  USING (organization_id = get_user_organization_id() AND get_user_role() = 'owner');

-- Floors
CREATE POLICY "floors_select" ON floors FOR SELECT
  USING (property_id IN (SELECT get_user_property_ids()));

CREATE POLICY "floors_write" ON floors FOR ALL
  USING (property_id IN (SELECT get_user_property_ids()) AND can_user_write());

-- Rooms
CREATE POLICY "rooms_select" ON rooms FOR SELECT
  USING (property_id IN (SELECT get_user_property_ids()));

CREATE POLICY "rooms_write" ON rooms FOR ALL
  USING (property_id IN (SELECT get_user_property_ids()) AND can_user_write());

-- Beds
CREATE POLICY "beds_select" ON beds FOR SELECT
  USING (property_id IN (SELECT get_user_property_ids()));

CREATE POLICY "beds_write" ON beds FOR ALL
  USING (property_id IN (SELECT get_user_property_ids()) AND can_user_write());

-- Residents
CREATE POLICY "residents_select" ON residents FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    AND (property_id IS NULL OR property_id IN (SELECT get_user_property_ids()))
  );

CREATE POLICY "residents_write" ON residents FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND (property_id IS NULL OR property_id IN (SELECT get_user_property_ids()))
    AND can_user_write()
  );

-- Bed Assignments
CREATE POLICY "bed_assignments_select" ON bed_assignments FOR SELECT
  USING (property_id IN (SELECT get_user_property_ids()));

CREATE POLICY "bed_assignments_write" ON bed_assignments FOR ALL
  USING (property_id IN (SELECT get_user_property_ids()) AND can_user_write());

-- Resident Contacts
CREATE POLICY "resident_contacts_select" ON resident_contacts FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "resident_contacts_write" ON resident_contacts FOR ALL
  USING (organization_id = get_user_organization_id() AND can_user_write());

-- Room Transfers
CREATE POLICY "room_transfers_select" ON room_transfers FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "room_transfers_write" ON room_transfers FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND can_user_write());

-- Payments
CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (property_id IN (SELECT get_user_property_ids()));

CREATE POLICY "payments_write" ON payments FOR ALL
  USING (property_id IN (SELECT get_user_property_ids()) AND can_user_write());

-- Security Deposits
CREATE POLICY "security_deposits_select" ON security_deposits FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "security_deposits_write" ON security_deposits FOR ALL
  USING (organization_id = get_user_organization_id() AND can_user_write());

-- Resident Documents
CREATE POLICY "resident_documents_select" ON resident_documents FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "resident_documents_write" ON resident_documents FOR ALL
  USING (organization_id = get_user_organization_id() AND can_user_write());

-- Activity Logs
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Notifications
CREATE POLICY "notifications_select" ON notifications FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "notifications_update" ON notifications FOR UPDATE
  USING (user_id = auth.uid() OR get_user_role() = 'owner');

CREATE POLICY "notifications_insert" ON notifications FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Storage bucket policies (run after creating bucket 'resident-documents')
-- CREATE POLICY "storage_select" ON storage.objects FOR SELECT
--   USING (bucket_id = 'resident-documents' AND auth.uid() IS NOT NULL);
-- CREATE POLICY "storage_insert" ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'resident-documents' AND auth.uid() IS NOT NULL);
-- CREATE POLICY "storage_delete" ON storage.objects FOR DELETE
--   USING (bucket_id = 'resident-documents' AND can_user_write());
