#!/usr/bin/env npx tsx
/**
 * Local-only GoTrue + demo identity regression.
 * Never targets hosted/staging. Does not print secrets.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";

const STAGING_REF = "wrrdaxiovgjlpaqfhwpn";

function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

function ok(msg: string) {
  console.log("OK", msg);
}

function parseStatusEnv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("WARN")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadLocalSupabaseEnv() {
  let raw: string;
  try {
    raw = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf8",
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    fail("Local Supabase is not running. Start it with npx supabase start.");
  }
  const env = parseStatusEnv(raw);
  const url = env.API_URL || env.SUPABASE_URL;
  const anon = env.ANON_KEY || env.SUPABASE_ANON_KEY;
  const service = env.SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    fail("Could not read local API_URL / ANON_KEY / SERVICE_ROLE_KEY from supabase status.");
  }
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    fail("Local API_URL is not a valid URL.");
  }
  if (host.endsWith(".supabase.co") || url.includes(STAGING_REF)) {
    fail("Refusing hosted or staging Supabase. This smoke is localhost-only.");
  }
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    fail(`Refusing non-local Auth host (${host}).`);
  }
  return { url, anon, service, host };
}

function randomPassword() {
  return `Aa1!${randomBytes(12).toString("base64url")}`;
}

function firstUuid(raw: string): string {
  const match = raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (!match) fail("Unexpected identifier from local SQL.");
  return match[0];
}

function assertUuid(id: string) {
  firstUuid(id);
}

function psql(sql: string): string {
  try {
    return execFileSync(
      "docker",
      [
        "exec",
        "-i",
        "supabase_db_pg-crm",
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-At",
      ],
      {
        encoding: "utf8",
        input: sql.endsWith(";") ? sql : `${sql};`,
        stdio: ["pipe", "pipe", "pipe"],
      }
    ).trim();
  } catch (err) {
    const extra = err && typeof err === "object" && "stderr" in err ? String((err as { stderr: unknown }).stderr) : "";
    const error = new Error(extra || (err instanceof Error ? err.message : "psql failed"));
    (error as Error & { stderr: string }).stderr = extra;
    throw error;
  }
}

function localQuery(sql: string): Record<string, unknown>[] {
  const inner = sql.replace(/;+\s*$/g, "").trim();
  const raw = psql(
    `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM (${inner}) t`
  );
  if (!raw.startsWith("[")) fail("Local SQL returned no JSON array.");
  return JSON.parse(raw) as Record<string, unknown>[];
}

function localExec(sql: string) {
  psql(sql);
}

function anonClient(url: string, anon: string) {
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(url: string, anon: string, email: string, password: string) {
  const client = anonClient(url, anon);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) fail("Password sign-in failed.");
  return client;
}

async function createTenantUser(
  admin: SupabaseClient,
  opts: { email: string; password: string; name: string; isDemo: boolean; slug: string }
) {
  const { data, error } = await admin.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: true,
    user_metadata: { full_name: opts.name, smoke: true },
  });
  if (error || !data.user) fail("Auth admin createUser failed.");
  const userId = data.user.id;
  assertUuid(userId);
  if (!/^smoke-(demo|real)-[0-9a-f]+$/.test(opts.slug)) fail("Unexpected smoke slug.");

  const orgId = firstUuid(psql(`
    INSERT INTO public.organizations (name, slug, is_active, is_demo, onboarding_completed_at)
    VALUES ('${opts.isDemo ? "Smoke Demo Org" : "Smoke Real Org"}', '${opts.slug}', true, ${opts.isDemo}, now())
    RETURNING id;
  `));
  assertUuid(orgId);

  localExec(`
    INSERT INTO public.profiles (id, organization_id, full_name, email, is_active)
    VALUES ('${userId}'::uuid, '${orgId}'::uuid, '${opts.isDemo ? "Smoke Demo Owner" : "Smoke Real Owner"}', '${opts.email}', true);
  `);
  localExec(`
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES ('${userId}'::uuid, '${orgId}'::uuid, 'owner');
  `);

  return { userId, orgId };
}

function expectSqlDenied(sql: string, label: string) {
  try {
    localExec(sql);
    fail(`${label} should have been blocked.`);
  } catch (err) {
    const extra = err && typeof err === "object" && "stderr" in err ? String((err as { stderr: unknown }).stderr) : "";
    const text = `${err instanceof Error ? err.message : ""} ${extra}`.toLowerCase();
    if (!text.includes("demo account cannot be modified") && !text.includes("cannot be modified")) {
      fail(`${label} failed for an unexpected reason.`);
    }
    ok(`${label} blocked`);
  }
}

function expectDenied(error: { message?: string } | null, label: string) {
  if (!error) fail(`${label} unexpectedly succeeded.`);
  ok(`${label} blocked`);
}

async function main() {
  process.env.PATH = `/Applications/Docker.app/Contents/Resources/bin:${process.env.PATH ?? ""}`;
  process.env.DOCKER_HOST =
    process.env.DOCKER_HOST || `unix://${homedir()}/.docker/run/docker.sock`;

  const { url, anon, service, host } = loadLocalSupabaseEnv();
  ok(`local Auth host ${host}`);

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const suffix = randomBytes(4).toString("hex");
  const demoEmail = `demo-smoke-${suffix}@localhost.local`;
  const normalEmail = `owner-smoke-${suffix}@localhost.local`;
  const demoPassword = randomPassword();
  const normalPassword = randomPassword();
  const nextNormalPassword = randomPassword();

  const demo = await createTenantUser(admin, {
    email: demoEmail,
    password: demoPassword,
    name: "Smoke Demo Org",
    isDemo: true,
    slug: `smoke-demo-${suffix}`,
  });
  const normal = await createTenantUser(admin, {
    email: normalEmail,
    password: normalPassword,
    name: "Smoke Real Org",
    isDemo: false,
    slug: `smoke-real-${suffix}`,
  });
  ok("created disposable demo and normal users");

  const { data: beforeDemo } = await admin.auth.admin.getUserById(demo.userId);
  const lastSignInBefore = beforeDemo.user?.last_sign_in_at ?? null;

  const demoSession = await signIn(url, anon, demoEmail, demoPassword);
  ok("demo user login");
  const normalSession = await signIn(url, anon, normalEmail, normalPassword);
  ok("normal user login");

  const { error: demoRefreshErr } = await demoSession.auth.refreshSession();
  if (demoRefreshErr) fail("Demo session refresh failed after trigger grant change.");
  const { data: demoUser, error: demoGetErr } = await demoSession.auth.getUser();
  if (demoGetErr || !demoUser.user) fail("Demo getUser failed.");
  ok("demo session refresh");

  const { error: normalRefreshErr } = await normalSession.auth.refreshSession();
  if (normalRefreshErr) fail("Normal session refresh failed after trigger grant change.");
  const { data: normalUser, error: normalGetErr } = await normalSession.auth.getUser();
  if (normalGetErr || !normalUser.user) fail("Normal getUser failed.");
  ok("normal session refresh");

  const { data: afterDemo } = await admin.auth.admin.getUserById(demo.userId);
  const lastSignInAfter = afterDemo.user?.last_sign_in_at ?? null;
  if (!lastSignInAfter) fail("Demo last_sign_in_at was not set after login.");
  if (lastSignInBefore && lastSignInAfter === lastSignInBefore) {
    fail("Demo last_sign_in_at did not change after login.");
  }
  ok("demo last_sign_in_at updated");

  const { error: demoEmailErr } = await demoSession.auth.updateUser({
    email: `blocked-${suffix}@localhost.local`,
  });
  expectDenied(demoEmailErr, "demo email update");

  const { error: demoPasswordErr } = await demoSession.auth.updateUser({
    password: randomPassword(),
  });
  expectDenied(demoPasswordErr, "demo password update");

  const { error: demoMetaErr } = await demoSession.auth.updateUser({
    data: { full_name: "Hacked Demo", smoke: false },
  });
  expectDenied(demoMetaErr, "demo metadata update");

  const { error: normalMetaErr } = await normalSession.auth.updateUser({
    data: { full_name: "Smoke Real Owner", smoke: true, note: "ok" },
  });
  if (normalMetaErr) fail("Normal metadata update should succeed.");
  const { data: normalAfterMeta } = await admin.auth.admin.getUserById(normal.userId);
  const meta = (normalAfterMeta.user?.user_metadata ?? {}) as Record<string, unknown>;
  if (meta.note !== "ok") fail("Normal user_metadata was not updated.");
  ok("normal metadata update");

  const { error: normalPwErr } = await normalSession.auth.updateUser({
    password: nextNormalPassword,
  });
  if (normalPwErr) fail("Normal password update should succeed.");
  await signIn(url, anon, normalEmail, nextNormalPassword);
  ok("normal password update and re-login");

  const anonRpc = anonClient(url, anon);
  const { error: anonRpcErr } = await anonRpc.rpc("protect_demo_auth_identity");
  if (!anonRpcErr) fail("anon RPC protect_demo_auth_identity should be denied.");
  ok("anon cannot execute protect_demo_auth_identity");

  const { error: authRpcErr } = await normalSession.rpc("protect_demo_auth_identity");
  if (!authRpcErr) fail("authenticated RPC protect_demo_auth_identity should be denied.");
  ok("authenticated cannot execute protect_demo_auth_identity");

  const priv = localQuery(`
    SELECT
      has_function_privilege('anon', 'public.protect_demo_auth_identity()', 'execute') AS anon_exec,
      has_function_privilege('authenticated', 'public.protect_demo_auth_identity()', 'execute') AS auth_exec;
  `)[0];
  if (priv?.anon_exec === true || priv?.auth_exec === true) {
    fail("protect_demo_auth_identity is still executable by anon or authenticated.");
  }
  ok("SQL execute revoked from anon and authenticated");

  expectSqlDenied(
    `UPDATE auth.users SET email = 'blocked-${suffix}@localhost.local' WHERE id = '${demo.userId}'::uuid;`,
    "SQL demo email update"
  );
  expectSqlDenied(
    `UPDATE auth.users SET encrypted_password = 'x' WHERE id = '${demo.userId}'::uuid;`,
    "SQL demo password update"
  );
  expectSqlDenied(
    `UPDATE auth.users SET raw_user_meta_data = '{"hack":true}'::jsonb WHERE id = '${demo.userId}'::uuid;`,
    "SQL demo metadata update"
  );
  localExec(`UPDATE auth.users SET last_sign_in_at = now(), updated_at = now() WHERE id = '${demo.userId}'::uuid;`);
  ok("SQL demo last_sign_in_at update allowed");
  localExec(`UPDATE auth.users SET raw_user_meta_data = '{"note":"ok"}'::jsonb WHERE id = '${normal.userId}'::uuid;`);
  ok("SQL non-demo metadata update allowed");

  const beforeStamp = localQuery(
    `SELECT updated_at::text AS updated_at FROM public.organizations WHERE id = '${normal.orgId}'::uuid;`
  )[0]?.updated_at;
  localExec(`UPDATE public.organizations SET name = 'Smoke Real Org Updated' WHERE id = '${normal.orgId}'::uuid;`);
  const afterStamp = localQuery(
    `SELECT updated_at::text AS updated_at FROM public.organizations WHERE id = '${normal.orgId}'::uuid;`
  )[0]?.updated_at;
  if (!afterStamp || afterStamp === beforeStamp) {
    fail("organizations.updated_at did not change after update.");
  }
  ok("update_updated_at_column still fires");

  localExec(`DELETE FROM public.user_roles WHERE user_id IN ('${demo.userId}'::uuid, '${normal.userId}'::uuid);`);
  localExec(`DELETE FROM public.profiles WHERE id IN ('${demo.userId}'::uuid, '${normal.userId}'::uuid);`);
  localExec(`DELETE FROM public.organizations WHERE id IN ('${demo.orgId}'::uuid, '${normal.orgId}'::uuid);`);
  await admin.auth.admin.deleteUser(demo.userId);
  await admin.auth.admin.deleteUser(normal.userId);
  ok("local Auth identity regression passed");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : "unknown error";
  fail(message);
});
