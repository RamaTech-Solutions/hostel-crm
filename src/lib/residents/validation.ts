import { z } from "zod";
import { optionalIndianMobileSchema, optionalIndianStateSchema, requiredIndianMobileSchema } from "@/lib/india/zod";

const optionalText = z.string().optional().or(z.literal(""));

export const residentCreateDetailsSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required"),
  mobile: requiredIndianMobileSchema,
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  gender: optionalText,
  date_of_birth: optionalText,
  address_line: optionalText,
  city: optionalText,
  state: optionalIndianStateSchema,
  pincode: z.string().regex(/^\d{6}$/, "Enter valid 6-digit pincode").optional().or(z.literal("")),
  guardian_name: optionalText,
  guardian_relation: optionalText,
  guardian_phone: optionalIndianMobileSchema,
  emergency_name: optionalText,
  emergency_phone: optionalIndianMobileSchema,
  company_college: optionalText,
  employee_student_id: optionalText,
  work_address: optionalText,
  id_type: z.enum(["aadhaar", "pan", "passport", "driving_license", "other", ""]).optional(),
  id_number: optionalText,
});

export const residentStaySchema = z.object({
  property_id: z.string().uuid("Select a property"),
  room_id: z.string().uuid("Select a room"),
  bed_id: z.string().uuid("Select a bed"),
  joining_date: z.string().min(1, "Move-in date is required"),
  planned_checkout_date: optionalText,
  monthly_rent: z.coerce.number().min(0, "Monthly rent is required"),
  security_deposit_amount: z.coerce.number().min(0).optional(),
  remarks: optionalText,
});

export const residentCreateSchema = residentCreateDetailsSchema.merge(residentStaySchema).extend({
  resident_id: z.string().uuid(),
});

export const residentProfileEditSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required"),
  mobile: z.string(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  gender: optionalText,
  date_of_birth: optionalText,
  address_line: optionalText,
  city: optionalText,
  state: z.string(),
  pincode: z.string().regex(/^\d{6}$/, "Enter valid 6-digit pincode").optional().or(z.literal("")),
  guardian_name: optionalText,
  guardian_relation: optionalText,
  guardian_phone: z.string(),
  emergency_name: optionalText,
  emergency_phone: z.string(),
  company_college: optionalText,
  employee_student_id: optionalText,
  work_address: optionalText,
  id_type: z.enum(["aadhaar", "pan", "passport", "driving_license", "other", ""]).optional(),
  id_number: optionalText,
  planned_checkout_date: optionalText,
  monthly_rent: z.coerce.number().min(0),
  security_deposit_amount: z.coerce.number().min(0).optional(),
  remarks: optionalText,
});

export type ResidentCreateInput = z.infer<typeof residentCreateSchema>;
