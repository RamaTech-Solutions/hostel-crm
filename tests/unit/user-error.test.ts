import { describe, it, expect } from "vitest";
import { toUserError } from "@/lib/user-error";

describe("toUserError", () => {
  it("maps duplicate email", () => {
    expect(toUserError("User already registered")).toMatch(/already exists/i);
  });

  it("hides RLS internals", () => {
    expect(toUserError('new row violates row-level security policy for table "properties"')).toMatch(/permission/i);
  });
});
