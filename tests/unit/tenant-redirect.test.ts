import { describe, expect, it } from "vitest";
import {
  destinationAfterSignUp,
  shouldClearSessionBeforeSignUp,
  tenantKindFromMembership,
  tenantRedirect,
} from "@/lib/auth/tenant-redirect";

describe("tenantRedirect", () => {
  it("never sends check-email to dashboard for demo or ready sessions", () => {
    expect(tenantRedirect("/signup/check-email", "demo")).toBeNull();
    expect(tenantRedirect("/signup/check-email", "ready")).toBeNull();
    expect(tenantRedirect("/signup/check-email", "incomplete")).toBeNull();
    expect(tenantRedirect("/signup/check-email", "anonymous")).toBeNull();
  });

  it("sends ready non-demo owners from exact /signup and /login to dashboard", () => {
    expect(tenantRedirect("/signup", "ready")).toBe("/dashboard");
    expect(tenantRedirect("/login", "ready")).toBe("/dashboard");
  });

  it("sends incomplete owners from exact /signup to onboarding without using signup/*", () => {
    expect(tenantRedirect("/signup", "incomplete")).toBe("/onboarding");
    expect(tenantRedirect("/dashboard", "incomplete")).toBe("/onboarding");
    expect(tenantRedirect("/onboarding", "incomplete")).toBeNull();
  });

  it("lets demo use signup and login for conversion", () => {
    expect(tenantRedirect("/signup", "demo")).toBeNull();
    expect(tenantRedirect("/login", "demo")).toBeNull();
    expect(tenantRedirect("/onboarding", "demo")).toBe("/dashboard");
  });

  it("does not treat /signup/extra as an auth form", () => {
    expect(tenantRedirect("/signup/extra", "ready")).toBeNull();
    expect(tenantRedirect("/signup/extra", "demo")).toBeNull();
  });

  it("leaves reset-password and auth callback alone", () => {
    expect(tenantRedirect("/reset-password", "incomplete")).toBeNull();
    expect(tenantRedirect("/auth/callback", "incomplete")).toBeNull();
    expect(tenantRedirect("/auth/callback", "ready")).toBeNull();
  });
});

describe("signup result routing", () => {
  it("routes confirmation-required signup to check-email", () => {
    expect(destinationAfterSignUp(null)).toBe("/signup/check-email");
  });

  it("routes a valid new session to onboarding", () => {
    expect(destinationAfterSignUp({ user: { id: "new-user" } })).toBe("/onboarding");
  });
});

describe("demo session conversion", () => {
  it("clears only demo sessions before signUp", () => {
    expect(shouldClearSessionBeforeSignUp("demo")).toBe(true);
    expect(shouldClearSessionBeforeSignUp("ready")).toBe(false);
    expect(shouldClearSessionBeforeSignUp("incomplete")).toBe(false);
    expect(shouldClearSessionBeforeSignUp("anonymous")).toBe(false);
  });

  it("does not classify UrbanStay as a real incomplete owner", () => {
    expect(
      tenantKindFromMembership({
        hasProfile: true,
        role: "owner",
        org: { is_demo: true, slug: "urbanstay-pg", onboarding_completed_at: "2026-01-01" },
      })
    ).toBe("demo");
  });
});
