import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const propertySchema = z.object({
  name: z.string().min(2, "Property name is required"),
  internal_code: z.string().optional(),
  address_line: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Enter valid 6-digit pincode"),
  contact_phone: z.string().regex(/^\d{10}$/, "Enter valid 10-digit mobile").optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "maintenance"]),
  floor_count: z.coerce.number().min(1).max(50),
  notes: z.string().optional(),
  manager_id: z.string().uuid().optional().nullable(),
});

export const roomSchema = z.object({
  property_id: z.string().uuid(),
  floor_id: z.string().uuid().optional().nullable(),
  room_number: z.string().min(1, "Room number is required"),
  room_type: z.enum(["single", "double", "triple", "dorm", "other"]),
  bed_capacity: z.coerce.number().min(1).max(20),
  monthly_rent: z.coerce.number().min(0),
  gender_restriction: z.enum(["male", "female", "mixed", "none"]),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  resident_id: z.string().uuid(),
  property_id: z.string().uuid(),
  amount: z.coerce.number().positive("Amount must be positive"),
  payment_date: z.string(),
  payment_type: z.enum(["rent", "deposit", "refund", "other"]),
  payment_method: z.enum(["cash", "upi", "bank_transfer", "card", "other"]),
  transaction_reference: z.string().optional(),
  rent_month: z.string().optional(),
  status: z.enum(["paid", "partial", "pending", "overdue"]),
  notes: z.string().optional(),
});

export const onboardingPersonalSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  photo_url: z.string().optional(),
});

export const onboardingContactSchema = z.object({
  mobile: z.string().regex(/^\d{10}$/, "Enter valid 10-digit mobile"),
  email: z.string().email().optional().or(z.literal("")),
  guardian_name: z.string().min(2, "Guardian name is required"),
  guardian_relation: z.string().min(2, "Relation is required"),
  guardian_phone: z.string().regex(/^\d{10}$/, "Enter valid 10-digit mobile"),
  emergency_name: z.string().optional(),
  emergency_phone: z.string().optional(),
});

export const onboardingAddressSchema = z.object({
  address_line: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Enter valid pincode"),
});

export const onboardingIdentitySchema = z.object({
  id_type: z.enum(["aadhaar", "pan", "passport", "driving_license", "other"]),
  id_number: z.string().min(4, "ID number is required"),
});

export const onboardingProfessionalSchema = z.object({
  company_college: z.string().optional(),
  employee_student_id: z.string().optional(),
  work_address: z.string().optional(),
});

export const onboardingStaySchema = z.object({
  property_id: z.string().uuid(),
  room_id: z.string().uuid(),
  bed_id: z.string().uuid(),
  joining_date: z.string(),
  planned_checkout_date: z.string().optional(),
  monthly_rent: z.coerce.number().min(0),
  security_deposit_amount: z.coerce.number().min(0),
  remarks: z.string().optional(),
});

export const checkoutSchema = z.object({
  checkout_date: z.string(),
  final_payment_amount: z.coerce.number().min(0).optional(),
  deposit_refund: z.coerce.number().min(0).optional(),
  deposit_deductions: z.coerce.number().min(0).optional(),
  remarks: z.string().optional(),
});

export const transferSchema = z.object({
  property_id: z.string().uuid(),
  room_id: z.string().uuid(),
  bed_id: z.string().uuid(),
  transfer_date: z.string(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type PropertyInput = z.infer<typeof propertySchema>;
export type RoomInput = z.infer<typeof roomSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
