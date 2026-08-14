#!/usr/bin/env npx tsx
/**
 * Seed script for UrbanStay PG demo data
 * Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL in .env.local
 *
 * Usage: npm run seed
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      // Strip surrounding quotes if present
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    console.error("Could not read .env.local — create it from .env.example");
    process.exit(1);
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

if (
  url.includes("your-project") ||
  serviceKey.includes("your-service-role-key") ||
  serviceKey === "your-service-role-key"
) {
  console.error(
    "\n❌ .env.local still has placeholder values.\n" +
      "   Save your real Supabase URL and service_role key to pg-crm/.env.local\n" +
      "   (Project Settings → API), then run: npm run seed\n"
  );
  process.exit(1);
}

console.log(`Using Supabase: ${url.replace(/^https?:\/\//, "")}`);

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "Demo@12345";

const INDIAN_NAMES = [
  "Rahul Sharma", "Amit Verma", "Priya Singh", "Neha Gupta", "Vikram Patel",
  "Ananya Reddy", "Karan Malhotra", "Sneha Iyer", "Arjun Nair", "Divya Joshi",
  "Rohan Mehta", "Kavya Desai", "Aditya Rao", "Pooja Kulkarni", "Sanjay Chopra",
  "Meera Banerjee", "Harsh Agarwal", "Isha Kapoor", "Varun Saxena", "Tanvi Mishra",
  "Akash Pandey", "Shreya Dutta", "Nikhil Choudhary", "Riya Bhat", "Manish Tiwari",
  "Aisha Khan", "Deepak Yadav", "Nidhi Sinha", "Gaurav Shah", "Swati Menon",
  "Rajesh Kumar", "Lakshmi Venkatesh", "Suresh Reddy", "Anjali Pillai", "Mohit Jain",
  "Pallavi Hegde", "Ravi Shankar", "Sunita Devi", "Ashok Prasad", "Kiran Bala",
];

function randomMobile() {
  const prefixes = ["98", "97", "96", "95", "94", "93", "91", "88", "87", "86"];
  return prefixes[Math.floor(Math.random() * prefixes.length)] +
    String(Math.floor(Math.random() * 90000000) + 10000000);
}

function randomDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d.toISOString().split("T")[0];
}

async function createAuthUser(email: string, name: string) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error && !error.message.includes("already")) throw error;
  if (data.user) return data.user.id;

  const { data: users } = await supabase.auth.admin.listUsers();
  return users.users.find((u) => u.email === email)?.id;
}

async function seed() {
  console.log("🌱 Starting seed...\n");

  // Organization
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .upsert({
      name: "UrbanStay PG",
      slug: "urbanstay-pg",
      is_active: true,
      is_demo: true,
      onboarding_completed_at: new Date().toISOString(),
    }, { onConflict: "slug" })
    .select()
    .single();
  if (orgError) throw orgError;
  console.log("✓ Organization:", org.name);

  // Auth users
  const ownerId = await createAuthUser("owner@demo-hostel.com", "Rajesh Owner");
  const managerId = await createAuthUser("manager@demo-hostel.com", "Suresh Manager");
  const viewerId = await createAuthUser("viewer@demo-hostel.com", "Anita Viewer");
  if (!ownerId || !managerId) throw new Error("Failed to create auth users");
  console.log("✓ Auth users created");

  // Profiles
  for (const [id, name, email] of [
    [ownerId, "Rajesh Owner", "owner@demo-hostel.com"],
    [managerId, "Suresh Manager", "manager@demo-hostel.com"],
    [viewerId, "Anita Viewer", "viewer@demo-hostel.com"],
  ] as const) {
    if (!id) continue;
    await supabase.from("profiles").upsert({
      id, organization_id: org.id, full_name: name, email, is_active: true,
    });
  }
  console.log("✓ Profiles created");

  // Roles
  await supabase.from("user_roles").upsert([
    { user_id: ownerId, organization_id: org.id, role: "owner" },
    { user_id: managerId, organization_id: org.id, role: "property_admin" },
    { user_id: viewerId, organization_id: org.id, role: "viewer" },
  ], { onConflict: "user_id,organization_id" });
  console.log("✓ Roles assigned");

  // Properties
  const propertiesData = [
    { name: "UrbanStay Sector 62", internal_code: "US-S62", address_line: "C-45, Sector 62", city: "Noida", state: "Uttar Pradesh", pincode: "201309", contact_phone: "9876543210", floor_count: 3 },
    { name: "UrbanStay Sector 63", internal_code: "US-S63", address_line: "B-12, Sector 63", city: "Noida", state: "Uttar Pradesh", pincode: "201301", contact_phone: "9876543211", floor_count: 2 },
    { name: "UrbanStay Knowledge Park", internal_code: "US-KP", address_line: "Plot 8, Knowledge Park II", city: "Greater Noida", state: "Uttar Pradesh", pincode: "201310", contact_phone: "9876543212", floor_count: 4 },
  ];

  const properties = [];
  for (const p of propertiesData) {
    const { data } = await supabase.from("properties").upsert({
      ...p, organization_id: org.id, manager_id: managerId, status: "active",
    }, { onConflict: "organization_id,internal_code" }).select().single();
    if (data) properties.push(data);
  }
  console.log(`✓ ${properties.length} properties created`);

  const propertyFloors = new Map<string, string>();
  for (const prop of properties) {
    const { data: floor } = await supabase.from("floors").upsert({
      property_id: prop.id,
      organization_id: org.id,
      floor_number: 0,
      label: "Ground / Unassigned",
    }, { onConflict: "property_id,floor_number" }).select().single();
    if (floor) propertyFloors.set(prop.id, floor.id);
  }

  // Assign manager to first property only
  await supabase.from("property_user_assignments").upsert({
    user_id: managerId, property_id: properties[0].id, organization_id: org.id,
  }, { onConflict: "user_id,property_id" });
  await supabase.from("property_user_assignments").upsert({
    user_id: viewerId, property_id: properties[0].id, organization_id: org.id,
  }, { onConflict: "user_id,property_id" });

  // Rooms & Beds
  const allBeds: { id: string; property_id: string; room_id: string; monthly_rent: number }[] = [];
  for (const prop of properties) {
    const roomCount = 6 + Math.floor(Math.random() * 4);
    for (let r = 1; r <= roomCount; r++) {
      const bedCapacity = 2 + Math.floor(Math.random() * 2);
      const rent = 6000 + Math.floor(Math.random() * 4000);
      const { data: room } = await supabase.from("rooms").insert({
        property_id: prop.id,
        organization_id: org.id,
        floor_id: propertyFloors.get(prop.id) ?? null,
        room_number: String(100 + r),
        room_type: bedCapacity <= 2 ? "double" : "triple",
        bed_capacity: bedCapacity,
        monthly_rent: rent,
        gender_restriction: "none",
        is_active: true,
      }).select().single();

      if (room) {
        const labels = ["A", "B", "C", "D"];
        for (let b = 0; b < bedCapacity; b++) {
          const { data: bed } = await supabase.from("beds").insert({
            room_id: room.id,
            property_id: prop.id,
            organization_id: org.id,
            bed_label: labels[b],
            status: "available",
            monthly_rent: rent,
          }).select().single();
          if (bed) allBeds.push({ ...bed, monthly_rent: rent });
        }
      }
    }
  }
  console.log(`✓ ${allBeds.length} beds created`);

  // Residents (~40)
  const residentCount = Math.min(40, Math.floor(allBeds.length * 0.85));
  const shuffledBeds = [...allBeds].sort(() => Math.random() - 0.5).slice(0, residentCount);

  for (let i = 0; i < shuffledBeds.length; i++) {
    const bed = shuffledBeds[i];
    const name = INDIAN_NAMES[i % INDIAN_NAMES.length];
    const mobile = randomMobile();
    const joiningDate = randomDate(180);
    const rent = bed.monthly_rent;

    const { data: resident } = await supabase.from("residents").insert({
      organization_id: org.id,
      property_id: bed.property_id,
      full_name: name,
      mobile,
      email: `${name.split(" ")[0].toLowerCase()}@demo.com`,
      gender: i % 3 === 0 ? "female" : "male",
      permanent_address: { address_line: "123 Demo Street", city: "Delhi", state: "Delhi", pincode: "110001" },
      id_type: "aadhaar",
      id_number_masked: `****-****-${String(1000 + i).slice(-4)}`,
      id_last_four: String(1000 + i).slice(-4),
      company_college: i % 2 === 0 ? "Infosys Ltd" : "Amity University",
      joining_date: joiningDate,
      planned_checkout_date: i % 8 === 0 ? randomDate(-30) : null,
      monthly_rent: rent,
      security_deposit_amount: rent,
      agreement_status: "active",
      status: i % 10 === 0 ? "notice_period" : "active",
    }).select().single();

    if (!resident) continue;

    await supabase.from("resident_contacts").insert({
      resident_id: resident.id,
      organization_id: org.id,
      contact_type: "guardian",
      name: `Parent of ${name.split(" ")[0]}`,
      relation: "Father",
      phone: randomMobile(),
    });

    const { data: assignment } = await supabase.from("bed_assignments").insert({
      resident_id: resident.id,
      bed_id: bed.id,
      room_id: bed.room_id,
      property_id: bed.property_id,
      organization_id: org.id,
      assigned_by: ownerId,
      start_date: joiningDate,
      is_active: true,
    }).select().single();

    await supabase.from("residents").update({ current_bed_assignment_id: assignment?.id }).eq("id", resident.id);
    await supabase.from("beds").update({ status: "occupied" }).eq("id", bed.id);

    await supabase.from("security_deposits").insert({
      resident_id: resident.id,
      organization_id: org.id,
      amount_held: rent,
      status: "held",
    });

    // Payments for ~70% residents this month
    if (Math.random() > 0.3) {
      const rentMonth = new Date().toISOString().slice(0, 7) + "-01";
      await supabase.from("payments").insert({
        resident_id: resident.id,
        property_id: bed.property_id,
        organization_id: org.id,
        recorded_by: managerId,
        amount: rent,
        payment_date: randomDate(30),
        payment_type: "rent",
        payment_method: ["upi", "cash", "bank_transfer"][Math.floor(Math.random() * 3)],
        rent_month: rentMonth,
        status: "paid",
      });
    }
  }
  console.log(`✓ ${shuffledBeds.length} residents onboarded`);

  // Notifications
  await supabase.from("notifications").insert([
    { organization_id: org.id, type: "rent_overdue", title: "Rent Overdue", message: "3 residents have pending rent for this month", severity: "warning" },
    { organization_id: org.id, type: "missing_document", title: "Missing Documents", message: "Aadhaar missing for 2 residents", severity: "info" },
    { organization_id: org.id, type: "checkout_reminder", title: "Checkout Approaching", message: "Rahul Sharma's planned checkout is tomorrow", severity: "warning", user_id: ownerId },
  ]);
  console.log("✓ Notifications created");

  // Activity logs
  await supabase.from("activity_logs").insert([
    { organization_id: org.id, user_id: managerId, action: "created", entity_type: "resident", metadata: { note: "Demo seed" } },
    { organization_id: org.id, user_id: ownerId, action: "payment_recorded", entity_type: "payment", metadata: {} },
  ]);
  console.log("✓ Activity logs created");

  console.log("\n✅ Seed complete!");
  console.log("\nDemo credentials (password for all):", DEMO_PASSWORD);
  console.log("  Owner:   owner@demo-hostel.com");
  console.log("  Manager: manager@demo-hostel.com");
  console.log("  Viewer:  viewer@demo-hostel.com");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
