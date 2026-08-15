import { describe, it, expect } from "vitest";
import { toUserError } from "@/lib/user-error";

describe("toUserError", () => {
  it("maps duplicate email", () => {
    expect(toUserError("User already registered")).toMatch(/already exists/i);
  });

  it("maps wrong credentials", () => {
    expect(toUserError("Invalid login credentials")).toBe("The email or password is incorrect.");
  });

  it("maps unconfirmed email", () => {
    expect(toUserError("Email not confirmed")).toBe("Please confirm your email before signing in.");
  });

  it("maps weak password", () => {
    expect(toUserError("Password should contain at least one character of each: ... WeakPasswordError")).toBe(
      "Your password doesn't meet Awaasly's password requirements."
    );
  });

  it("maps expired recovery", () => {
    expect(toUserError("Email link is invalid or has expired")).toBe("This reset link has expired. Request a new one.");
  });

  it("maps rate limits", () => {
    expect(toUserError("For security purposes, you can only request this after 60 seconds.")).toBe(
      "Too many attempts. Please wait a moment and try again."
    );
  });

  it("maps network failure", () => {
    expect(toUserError("Failed to fetch")).toBe("We couldn't reach Awaasly. Check your connection and try again.");
  });

  it("hides RLS internals", () => {
    expect(toUserError('new row violates row-level security policy for table "properties"')).toMatch(/permission/i);
  });

  it("does not expose AuthApiError", () => {
    expect(toUserError("AuthApiError: invalid_grant")).toBe("Something went wrong. Please try again.");
  });
});
