-- PG CRM Database Schema
-- Run this in Supabase SQL Editor or via Supabase CLI

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('owner', 'property_admin', 'viewer');
CREATE TYPE property_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE room_type AS ENUM ('single', 'double', 'triple', 'dorm', 'other');
CREATE TYPE gender_restriction AS ENUM ('male', 'female', 'mixed', 'none');
CREATE TYPE bed_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance');
CREATE TYPE resident_status AS ENUM ('active', 'notice_period', 'checked_out', 'blacklisted');
CREATE TYPE id_type AS ENUM ('aadhaar', 'pan', 'passport', 'driving_license', 'other');
CREATE TYPE agreement_status AS ENUM ('active', 'expired', 'pending');
CREATE TYPE contact_type AS ENUM ('guardian', 'emergency', 'other');
CREATE TYPE payment_type AS ENUM ('rent', 'deposit', 'refund', 'other');
CREATE TYPE payment_method AS ENUM ('cash', 'upi', 'bank_transfer', 'card', 'other');
CREATE TYPE payment_status AS ENUM ('paid', 'partial', 'pending', 'overdue');
CREATE TYPE deposit_status AS ENUM ('held', 'partial_refund', 'refunded', 'forfeited');
CREATE TYPE document_type AS ENUM (
  'profile_photo', 'aadhaar', 'pan', 'driving_license', 'passport',
  'college_id', 'employee_id', 'agreement', 'police_verification', 'other'
);
CREATE TYPE activity_action AS ENUM (
  'created', 'updated', 'deleted', 'assigned', 'transferred',
  'checked_out', 'payment_recorded', 'document_uploaded'
);
CREATE TYPE notification_type AS ENUM (
  'rent_overdue', 'missing_document', 'checkout_reminder', 'agreement_expiry', 'general'
);
CREATE TYPE notification_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE notification_channel AS ENUM ('in_app');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User Roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE TRIGGER user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Properties
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  internal_code TEXT,
  address_line TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  contact_phone TEXT,
  status property_status DEFAULT 'active',
  floor_count INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, internal_code)
);

CREATE INDEX idx_properties_org ON properties(organization_id);
CREATE INDEX idx_properties_status ON properties(status);
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Property User Assignments
CREATE TABLE property_user_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, property_id)
);

CREATE INDEX idx_pua_user ON property_user_assignments(user_id);
CREATE INDEX idx_pua_property ON property_user_assignments(property_id);

-- Floors
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  floor_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, floor_number)
);

CREATE INDEX idx_floors_property ON floors(property_id);
CREATE TRIGGER floors_updated_at BEFORE UPDATE ON floors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  floor_id UUID REFERENCES floors(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_type room_type DEFAULT 'double',
  bed_capacity INTEGER NOT NULL DEFAULT 2,
  monthly_rent NUMERIC(10,2) NOT NULL DEFAULT 0,
  gender_restriction gender_restriction DEFAULT 'none',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, room_number)
);

CREATE INDEX idx_rooms_property ON rooms(property_id);
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Beds
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bed_label TEXT NOT NULL,
  status bed_status DEFAULT 'available',
  monthly_rent NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, bed_label)
);

CREATE INDEX idx_beds_property ON beds(property_id);
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_beds_room ON beds(room_id);
CREATE TRIGGER beds_updated_at BEFORE UPDATE ON beds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Residents
CREATE TABLE residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  current_bed_assignment_id UUID,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  mobile TEXT NOT NULL,
  email TEXT,
  permanent_address JSONB DEFAULT '{}',
  id_type id_type,
  id_number_masked TEXT,
  id_last_four TEXT,
  photo_url TEXT,
  company_college TEXT,
  employee_student_id TEXT,
  work_address TEXT,
  joining_date DATE NOT NULL,
  planned_checkout_date DATE,
  monthly_rent NUMERIC(10,2) NOT NULL DEFAULT 0,
  security_deposit_amount NUMERIC(10,2) DEFAULT 0,
  agreement_status agreement_status DEFAULT 'pending',
  status resident_status DEFAULT 'active',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_residents_org ON residents(organization_id);
CREATE INDEX idx_residents_property ON residents(property_id);
CREATE INDEX idx_residents_status ON residents(status);
CREATE INDEX idx_residents_mobile ON residents(mobile);
CREATE INDEX idx_residents_name ON residents(full_name);
CREATE TRIGGER residents_updated_at BEFORE UPDATE ON residents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Bed Assignments (historical)
CREATE TABLE bed_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  bed_id UUID NOT NULL REFERENCES beds(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX one_active_bed_assignment ON bed_assignments (bed_id)
  WHERE is_active = true AND end_date IS NULL;

CREATE INDEX idx_bed_assignments_resident ON bed_assignments(resident_id);
CREATE INDEX idx_bed_assignments_bed ON bed_assignments(bed_id);
CREATE INDEX idx_bed_assignments_active ON bed_assignments(is_active) WHERE is_active = true;
CREATE TRIGGER bed_assignments_updated_at BEFORE UPDATE ON bed_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE residents ADD CONSTRAINT fk_current_bed_assignment
  FOREIGN KEY (current_bed_assignment_id) REFERENCES bed_assignments(id) ON DELETE SET NULL;

-- Resident Contacts
CREATE TABLE resident_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_type contact_type NOT NULL DEFAULT 'guardian',
  name TEXT NOT NULL,
  relation TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resident_contacts_resident ON resident_contacts(resident_id);
CREATE TRIGGER resident_contacts_updated_at BEFORE UPDATE ON resident_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Room Transfers
CREATE TABLE room_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  from_bed_assignment_id UUID NOT NULL REFERENCES bed_assignments(id),
  to_bed_assignment_id UUID NOT NULL REFERENCES bed_assignments(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transferred_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_room_transfers_resident ON room_transfers(resident_id);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_type payment_type NOT NULL DEFAULT 'rent',
  payment_method payment_method NOT NULL DEFAULT 'cash',
  transaction_reference TEXT,
  rent_month DATE,
  status payment_status NOT NULL DEFAULT 'paid',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_payments_property ON payments(property_id);
CREATE INDEX idx_payments_resident ON payments(resident_id);
CREATE INDEX idx_payments_rent_month ON payments(rent_month);
CREATE INDEX idx_payments_status ON payments(status);
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Security Deposits
CREATE TABLE security_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount_held NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_refunded NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  refund_date DATE,
  status deposit_status DEFAULT 'held',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_security_deposits_resident ON security_deposits(resident_id);
CREATE TRIGGER security_deposits_updated_at BEFORE UPDATE ON security_deposits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Resident Documents
CREATE TABLE resident_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  document_type document_type NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resident_documents_resident ON resident_documents(resident_id);
CREATE INDEX idx_resident_documents_type ON resident_documents(document_type);
CREATE TRIGGER resident_documents_updated_at BEFORE UPDATE ON resident_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activity Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action activity_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_org ON activity_logs(organization_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  severity notification_severity DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  channel notification_channel DEFAULT 'in_app',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(is_read) WHERE is_read = false;
