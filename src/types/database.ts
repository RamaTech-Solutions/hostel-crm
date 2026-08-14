export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "owner" | "property_admin" | "viewer";
export type PropertyStatus = "active" | "inactive" | "maintenance";
export type BedStatus = "available" | "occupied" | "reserved" | "maintenance";
export type ResidentStatus = "active" | "notice_period" | "checked_out" | "blacklisted";
export type PaymentStatus = "paid" | "partial" | "pending" | "overdue";
export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "card" | "other";
export type PaymentType = "rent" | "deposit" | "refund" | "other";
export type DocumentType =
  | "profile_photo"
  | "aadhaar"
  | "pan"
  | "driving_license"
  | "passport"
  | "college_id"
  | "employee_id"
  | "agreement"
  | "police_verification"
  | "other";
export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "assigned"
  | "transferred"
  | "checked_out"
  | "payment_recorded"
  | "document_uploaded";
export type NotificationType =
  | "rent_overdue"
  | "missing_document"
  | "checkout_reminder"
  | "agreement_expiry"
  | "general";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Json;
  is_active: boolean;
  is_demo: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  organization_id: string;
  manager_id: string | null;
  name: string;
  internal_code: string | null;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  contact_phone: string | null;
  status: PropertyStatus;
  floor_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  manager?: Profile | null;
}

export interface Floor {
  id: string;
  property_id: string;
  organization_id: string;
  floor_number: number;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  property_id: string;
  floor_id: string | null;
  organization_id: string;
  room_number: string;
  room_type: string;
  bed_capacity: number;
  monthly_rent: number;
  gender_restriction: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  floor?: Floor | null;
  beds?: Bed[];
}

export interface Bed {
  id: string;
  room_id: string;
  property_id: string;
  organization_id: string;
  bed_label: string;
  status: BedStatus;
  monthly_rent: number | null;
  created_at: string;
  updated_at: string;
  room?: Room;
  current_resident?: Resident | null;
}

export interface Resident {
  id: string;
  organization_id: string;
  property_id: string | null;
  current_bed_assignment_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  mobile: string;
  email: string | null;
  permanent_address: Json;
  id_type: string | null;
  id_number_masked: string | null;
  id_last_four: string | null;
  photo_url: string | null;
  company_college: string | null;
  employee_student_id: string | null;
  work_address: string | null;
  joining_date: string;
  planned_checkout_date: string | null;
  monthly_rent: number;
  security_deposit_amount: number;
  agreement_status: string;
  status: ResidentStatus;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  property?: Property | null;
  bed_assignment?: BedAssignment | null;
  contacts?: ResidentContact[];
}

export interface BedAssignment {
  id: string;
  resident_id: string;
  bed_id: string;
  room_id: string;
  property_id: string;
  organization_id: string;
  assigned_by: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  bed?: Bed;
  room?: Room;
  property?: Property;
  resident?: Resident;
}

export interface ResidentContact {
  id: string;
  resident_id: string;
  organization_id: string;
  contact_type: string;
  name: string;
  relation: string | null;
  phone: string;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  resident_id: string;
  property_id: string;
  organization_id: string;
  recorded_by: string | null;
  amount: number;
  payment_date: string;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  transaction_reference: string | null;
  rent_month: string | null;
  status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  resident?: Resident;
  property?: Property;
}

export interface ResidentDocument {
  id: string;
  resident_id: string;
  organization_id: string;
  uploaded_by: string | null;
  document_type: DocumentType;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: ActivityAction;
  entity_type: string;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
  user?: Profile | null;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string | null;
  property_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  severity: "info" | "warning" | "critical";
  is_read: boolean;
  channel: string;
  created_at: string;
}

export interface RoomTransfer {
  id: string;
  resident_id: string;
  from_bed_assignment_id: string;
  to_bed_assignment_id: string;
  organization_id: string;
  transferred_by: string | null;
  transfer_date: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface SecurityDeposit {
  id: string;
  resident_id: string;
  organization_id: string;
  amount_held: number;
  amount_refunded: number;
  deductions: number;
  refund_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalProperties: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyPercent: number;
  activeResidents: number;
  joiningThisMonth: number;
  leavingThisMonth: number;
  monthlyRentExpected: number;
  rentCollected: number;
  outstandingRent: number;
  securityDepositsHeld: number;
}

export interface PropertyStats {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  monthlyExpectedRevenue: number;
  collectedRent: number;
  pendingRent: number;
  occupancyPercent: number;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: Profile;
  role: UserRole;
  organization: Organization;
  assignedPropertyIds: string[];
}

export type Database = {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: Partial<Organization>; Update: Partial<Organization> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      user_roles: { Row: UserRoleRecord; Insert: Partial<UserRoleRecord>; Update: Partial<UserRoleRecord> };
      properties: { Row: Property; Insert: Partial<Property>; Update: Partial<Property> };
      floors: { Row: Floor; Insert: Partial<Floor>; Update: Partial<Floor> };
      rooms: { Row: Room; Insert: Partial<Room>; Update: Partial<Room> };
      beds: { Row: Bed; Insert: Partial<Bed>; Update: Partial<Bed> };
      residents: { Row: Resident; Insert: Partial<Resident>; Update: Partial<Resident> };
      bed_assignments: { Row: BedAssignment; Insert: Partial<BedAssignment>; Update: Partial<BedAssignment> };
      resident_contacts: { Row: ResidentContact; Insert: Partial<ResidentContact>; Update: Partial<ResidentContact> };
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment> };
      resident_documents: { Row: ResidentDocument; Insert: Partial<ResidentDocument>; Update: Partial<ResidentDocument> };
      activity_logs: { Row: ActivityLog; Insert: Partial<ActivityLog>; Update: Partial<ActivityLog> };
      notifications: { Row: Notification; Insert: Partial<Notification>; Update: Partial<Notification> };
      room_transfers: { Row: RoomTransfer; Insert: Partial<RoomTransfer>; Update: Partial<RoomTransfer> };
      security_deposits: { Row: SecurityDeposit; Insert: Partial<SecurityDeposit>; Update: Partial<SecurityDeposit> };
      property_user_assignments: { Row: { id: string; user_id: string; property_id: string; organization_id: string; created_at: string }; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
    Functions: {
      bootstrap_organization: {
        Args: { p_organization_name: string; p_full_name: string; p_phone?: string | null };
        Returns: string;
      };
    };
  };
};
