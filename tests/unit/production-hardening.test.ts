import { describe, expect, it } from "vitest";
import { canMutateTenant, canOwn, canWrite, isOwner } from "@/lib/auth/permissions";
import { sanitizeSearchTerm } from "@/lib/search";
import { parsePage, pageRange, LIST_PAGE_SIZE } from "@/lib/list-query";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AuthUser } from "@/types/database";

function user(role: AuthUser["role"], is_demo: boolean): AuthUser {
  return {
    id: "u1",
    email: "t@example.com",
    role,
    assignedPropertyIds: [],
    organization: {
      id: "o1",
      name: "Org",
      slug: "org",
      logo_url: null,
      settings: {},
      is_active: true,
      is_demo,
      onboarding_completed_at: "2026-01-01",
      rent_due_day: 5,
      created_at: "",
      updated_at: "",
    },
    profile: {
      id: "u1",
      organization_id: "o1",
      full_name: "Test",
      email: "t@example.com",
      phone: null,
      avatar_url: null,
      is_active: true,
      created_at: "",
      updated_at: "",
    },
  } as AuthUser;
}

describe("demo write lock", () => {
  it("keeps real owner and admin writable", () => {
    expect(canWrite(user("owner", false))).toBe(true);
    expect(canWrite(user("property_admin", false))).toBe(true);
    expect(canOwn(user("owner", false))).toBe(true);
    expect(isOwner(user("owner", true))).toBe(true);
  });

  it("denies demo mutations while still treating demo as owner for reads", () => {
    const demoOwner = user("owner", true);
    expect(canMutateTenant(demoOwner)).toBe(false);
    expect(canWrite(demoOwner)).toBe(false);
    expect(canOwn(demoOwner)).toBe(false);
    expect(canWrite(user("property_admin", true))).toBe(false);
    expect(canWrite(user("viewer", false))).toBe(false);
  });
});

describe("search sanitize", () => {
  it("trims, caps length, and strips PostgREST or/ilike metacharacters", () => {
    expect(sanitizeSearchTerm("  ana, %_x)  ")).toBe("ana x");
    expect(sanitizeSearchTerm(`${"a".repeat(100)}`)).toHaveLength(80);
  });
});

describe("pagination", () => {
  it("parses pages and ranges", () => {
    expect(parsePage("0")).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(pageRange(2, LIST_PAGE_SIZE)).toEqual({ from: 50, to: 99 });
  });
});

describe("sprint 8 migration", () => {
  it("locks demo writes and auth identity", () => {
    const sql = readFileSync(
      resolve(__dirname, "../../supabase/migrations/20260815200000_demo_write_protection.sql"),
      "utf8"
    );
    expect(sql).toContain("can_mutate_tenant");
    expect(sql).toContain("can_user_own");
    expect(sql).toContain("protect_demo_auth_identity");
    expect(sql).toContain("BEFORE UPDATE ON auth.users");
    expect(sql).toContain("AND public.can_user_own()");
  });
});
