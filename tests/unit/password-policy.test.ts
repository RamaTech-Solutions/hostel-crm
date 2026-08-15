import { describe, it, expect } from "vitest";
import { validatePassword } from "@/lib/auth/password-policy";
import { resetPasswordSchema, signupSchema } from "@/lib/validations/schemas";

describe("validatePassword", () => {
  it("fails passwords shorter than 8 characters", () => {
    expect(validatePassword("Ab1!x").valid).toBe(false);
    expect(validatePassword("Ab1!x").minLength).toBe(false);
  });

  it("fails when uppercase is missing", () => {
    expect(validatePassword("password1!").uppercase).toBe(false);
    expect(validatePassword("password1!").valid).toBe(false);
  });

  it("fails when lowercase is missing", () => {
    expect(validatePassword("PASSWORD1!").lowercase).toBe(false);
    expect(validatePassword("PASSWORD1!").valid).toBe(false);
  });

  it("fails when number is missing", () => {
    expect(validatePassword("Password!").number).toBe(false);
    expect(validatePassword("Password!").valid).toBe(false);
  });

  it("fails when symbol is missing", () => {
    expect(validatePassword("Password1").symbol).toBe(false);
    expect(validatePassword("Password1").valid).toBe(false);
  });

  it("passes a valid password", () => {
    const result = validatePassword("Password1!");
    expect(result).toEqual({
      minLength: true,
      uppercase: true,
      lowercase: true,
      number: true,
      symbol: true,
      valid: true,
    });
  });
});

describe("confirm password", () => {
  const base = {
    full_name: "Test Owner",
    organization_name: "Test PG",
    email: "owner@example.com",
    phone: "9876543210",
  };

  it("rejects mismatch on signup", () => {
    const result = signupSchema.safeParse({
      ...base,
      password: "Password1!",
      confirm_password: "Password2!",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Passwords do not match.");
    }
  });

  it("rejects mismatch on reset", () => {
    const result = resetPasswordSchema.safeParse({
      password: "Password1!",
      confirm_password: "Password2!",
    });
    expect(result.success).toBe(false);
  });
});
