#!/usr/bin/env npx tsx
/**
 * Post-migration smoke: demo logins + property isolation + disposable bootstrap.
 * Loads .env.local. Does not print secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const demoEmail = process.env.DEMO_OWNER_EMAIL!;
const demoPassword = process.env.DEMO_OWNER_PASSWORD!;

function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

async function signIn(email: string, password: string) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) fail(`${email} login: ${error.message}`);
  return client;
}

async function main() {
  const owner = await signIn(demoEmail, demoPassword);
  const { data: org, error: orgErr } = await owner
    .from("organizations")
    .select("id, slug, is_demo, onboarding_completed_at")
    .single();
  if (orgErr || !org) fail(orgErr?.message ?? "owner cannot read org");
  if (org.slug !== "urbanstay-pg") fail("unexpected demo slug");
  if (!org.is_demo) fail("demo org is_demo should be true");
  if (!org.onboarding_completed_at) fail("demo org should skip onboarding");
  console.log("OK demo owner org flags");

  const { data: ownerProps } = await owner.from("properties").select("id");
  const { count: ownerResidents } = await owner
    .from("residents")
    .select("id", { count: "exact", head: true });
  const { count: floors } = await owner
    .from("floors")
    .select("id", { count: "exact", head: true });
  if (!ownerProps?.length) fail("owner sees no properties");
  if (!ownerResidents) fail("owner sees no residents");
  if (!floors) fail("floor backfill produced 0 floors");
  console.log(
    `OK owner properties=${ownerProps.length} residents=${ownerResidents} floors=${floors}`
  );

  const manager = await signIn("manager@demo-hostel.com", demoPassword);
  const { data: mgrProps } = await manager.from("properties").select("id");
  const { count: mgrResidents } = await manager
    .from("residents")
    .select("id", { count: "exact", head: true });
  if (!mgrProps?.length) fail("manager sees no assigned property");
  if (mgrProps.length >= ownerProps.length) fail("manager should see fewer properties than owner");
  if ((mgrResidents ?? 0) >= (ownerResidents ?? 0)) {
    fail("manager should see fewer residents than owner");
  }
  console.log(
    `OK manager properties=${mgrProps.length} residents=${mgrResidents}`
  );

  const viewer = await signIn("viewer@demo-hostel.com", demoPassword);
  const { error: viewerWrite } = await viewer.from("rooms").insert({
    property_id: mgrProps[0].id,
    organization_id: org.id,
    room_number: "SMOKE-SHOULD-FAIL",
    bed_capacity: 1,
    monthly_rent: 1,
  });
  if (!viewerWrite) fail("viewer was able to insert a room");
  console.log("OK viewer write blocked");

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const smokeEmail = `awaasly-smoke-${Date.now()}@example.com`;
  const smokePass = "SmokeTest-9f3k!";
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: smokeEmail,
    password: smokePass,
    email_confirm: true,
    user_metadata: { full_name: "Smoke Owner", organization_name: "Smoke PG" },
  });
  if (createErr || !created.user) fail(createErr?.message ?? "create smoke user");

  try {
    const smoke = await signIn(smokeEmail, smokePass);
    const { data: id1, error: b1 } = await smoke.rpc("bootstrap_organization", {
      p_organization_name: "Smoke PG",
      p_full_name: "Smoke Owner",
      p_phone: null,
    });
    if (b1 || !id1) fail(b1?.message ?? "bootstrap failed");
    const { data: id2, error: b2 } = await smoke.rpc("bootstrap_organization", {
      p_organization_name: "Smoke PG Other",
      p_full_name: "Smoke Owner",
      p_phone: null,
    });
    if (b2) fail(b2.message);
    if (id1 !== id2) fail("bootstrap was not idempotent");

    const { count: leak } = await smoke
      .from("residents")
      .select("id", { count: "exact", head: true });
    if ((leak ?? 0) !== 0) fail("new org can see demo residents");

    const { data: smokeOrg } = await smoke.from("organizations").select("id, slug").single();
    if (!smokeOrg?.slug?.startsWith("smoke-pg-")) fail("unexpected new org slug");

    const { error: propErr } = await smoke
      .from("properties")
      .insert({
        organization_id: smokeOrg.id,
        name: "Smoke Property",
        address_line: "1 Test Street",
        city: "Delhi",
        state: "Delhi",
        pincode: "110001",
        status: "active",
        floor_count: 1,
      })
      .select("id")
      .single();
    if (propErr) fail(propErr.message);
    console.log("OK disposable owner can insert property");
    console.log("OK disposable signup isolated and idempotent");

    await admin.from("organizations").delete().eq("id", smokeOrg.id);
  } finally {
    await admin.auth.admin.deleteUser(created.user.id);
    console.log("OK disposable user removed");
  }

  console.log("SMOKE PASSED");
}

main().catch((e) => fail(String(e)));
