import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { slugifyOrganizationName } from "@/lib/org-slug";
import { signupSchema } from "@/lib/validations/schemas";

function migration(name: string) {
  return readFileSync(resolve(__dirname, "../../supabase/migrations", name), "utf8");
}

describe("org slug", () => {
  it("slugifies business names", () => {
    expect(slugifyOrganizationName("Urban Stay PG")).toBe("urban-stay-pg");
  });
});

describe("signup schema", () => {
  it("accepts a valid owner signup", () => {
    const result = signupSchema.safeParse({
      full_name: "Test Owner",
      organization_name: "Test PG",
      email: "owner@example.com",
      password: "password1",
      confirm_password: "password1",
      phone: "9876543210",
    });
    expect(result.success).toBe(true);
  });
});

describe("migration guards", () => {
  it("helpers use empty search_path and qualified names", () => {
    const sql = migration("20260814120100_harden_security_definer.sql");
    expect(sql).toContain("SET search_path = ''");
    expect(sql).toContain("FROM public.profiles");
    expect(sql).toContain("AND p.organization_id = ur.organization_id");
    expect(sql).toContain("GRANT EXECUTE");
    expect(sql).toContain("REVOKE ALL");
  });

  it("storage policies key off path folders not the whole bucket", () => {
    const sql = migration("20260814120200_harden_storage_rls.sql");
    expect(sql).toContain("storage.foldername(name)");
    expect(sql).not.toMatch(/USING \(bucket_id = 'resident-documents'\);/);
  });

  it("resident child tables use can_access_resident", () => {
    const sql = migration("20260814120300_harden_table_rls.sql");
    expect(sql).toContain("public.can_access_resident(resident_id)");
    expect(sql).toContain("property_id IS NULL AND public.get_user_role() = 'owner'");
  });

  it("history FKs use RESTRICT", () => {
    const sql = migration("20260814120500_protect_history.sql");
    expect(sql).toContain("ON DELETE RESTRICT");
  });

  it("bootstrap uses auth.uid and is SECURITY DEFINER", () => {
    const sql = migration("20260814120700_signup_org_bootstrap.sql");
    expect(sql).toContain("v_uid := auth.uid()");
    expect(sql).toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = ''");
    expect(sql).not.toContain("p_user_id");
  });
});
