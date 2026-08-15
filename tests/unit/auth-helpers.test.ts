import { describe, it, expect } from "vitest";
import { isSafeNextPath } from "@/lib/app-url";
import { forgotPasswordSchema, loginSchema } from "@/lib/validations/schemas";

describe("isSafeNextPath", () => {
  it("accepts in-app paths", () => {
    expect(isSafeNextPath("/dashboard")).toBe(true);
    expect(isSafeNextPath("/properties/abc")).toBe(true);
  });

  it("rejects open redirects", () => {
    expect(isSafeNextPath("https://evil.example")).toBe(false);
    expect(isSafeNextPath("//evil.example")).toBe(false);
    expect(isSafeNextPath("\\evil")).toBe(false);
  });
});

describe("forgot password schema", () => {
  it("accepts a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "owner@example.com" }).success).toBe(true);
  });

  it("rejects an invalid email format", () => {
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});

describe("login schema", () => {
  it("does not apply signup password policy", () => {
    expect(loginSchema.safeParse({ email: "owner@demo.com", password: "short" }).success).toBe(true);
  });
});
