import { describe, expect, it } from "vitest";
import { INDIA_STATES_AND_UTS, resolveStateForWrite, stateSelectOptions } from "@/lib/india/states";
import { normalizeIndianMobile, resolveMobileForWrite } from "@/lib/india/phone";
import { signupSchema, propertySchema } from "@/lib/validations/schemas";
import { residentCreateDetailsSchema } from "@/lib/residents/validation";

describe("normalizeIndianMobile", () => {
  it("accepts formatted India numbers", () => {
    expect(normalizeIndianMobile("+91 98765 43210")).toEqual({ kind: "ok", value: "9876543210" });
    expect(normalizeIndianMobile("919876543210")).toEqual({ kind: "ok", value: "9876543210" });
    expect(normalizeIndianMobile("9876543210")).toEqual({ kind: "ok", value: "9876543210" });
    expect(normalizeIndianMobile(" 98765-43210 ")).toEqual({ kind: "ok", value: "9876543210" });
  });

  it("preserves empty for optional fields", () => {
    expect(normalizeIndianMobile("")).toEqual({ kind: "empty", value: "" });
    expect(normalizeIndianMobile("   ")).toEqual({ kind: "empty", value: "" });
    expect(normalizeIndianMobile(null)).toEqual({ kind: "empty", value: "" });
  });

  it("does not strip arbitrary 12-digit values", () => {
    expect(normalizeIndianMobile("889876543210").kind).toBe("invalid");
    expect(normalizeIndianMobile("987654321").kind).toBe("invalid");
    expect(normalizeIndianMobile("98765432101").kind).toBe("invalid");
  });
});

describe("resolveStateForWrite", () => {
  it("rejects UP on create and accepts official names", () => {
    expect(resolveStateForWrite("UP", undefined, true).ok).toBe(false);
    expect(resolveStateForWrite("Uttar Pradesh", undefined, true)).toEqual({
      ok: true,
      value: "Uttar Pradesh",
    });
  });

  it("allows unchanged legacy from stored DB value only", () => {
    expect(resolveStateForWrite("UP", "UP", true)).toEqual({ ok: true, value: "UP" });
    expect(resolveStateForWrite("Rajasthan", "UP", true)).toEqual({ ok: true, value: "Rajasthan" });
    expect(resolveStateForWrite("Narnia", "UP", true).ok).toBe(false);
    expect(resolveStateForWrite("UP", "Uttar Pradesh", true).ok).toBe(false);
  });

  it("does not put legacy values on the official list", () => {
    expect(INDIA_STATES_AND_UTS).not.toContain("UP");
    expect(stateSelectOptions("UP")[0]).toBe("UP");
    expect(stateSelectOptions("UP")).toEqual(["UP", ...INDIA_STATES_AND_UTS]);
    expect(stateSelectOptions()).toEqual([...INDIA_STATES_AND_UTS]);
  });
});

describe("resolveMobileForWrite", () => {
  it("keeps stored legacy when submitted equals stored", () => {
    expect(resolveMobileForWrite("12345", "12345", true)).toEqual({ ok: true, value: "12345" });
  });

  it("does not trust a different submitted value as legacy", () => {
    expect(resolveMobileForWrite("12345", "9876543210", true).ok).toBe(false);
  });

  it("enforces 10 digits when the field changes", () => {
    expect(resolveMobileForWrite("9876543210", "12345", true)).toEqual({ ok: true, value: "9876543210" });
    expect(resolveMobileForWrite("987654321", "12345", true).ok).toBe(false);
  });
});

describe("create schemas", () => {
  it("normalizes signup phone and rejects short numbers", () => {
    const base = {
      full_name: "Test Owner",
      organization_name: "Test PG",
      email: "owner@example.com",
      password: "Password1!",
      confirm_password: "Password1!",
    };
    const ok = signupSchema.safeParse({ ...base, phone: "+91 98765 43210" });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.phone).toBe("9876543210");
    expect(signupSchema.safeParse({ ...base, phone: "987654321" }).success).toBe(false);
  });

  it("still structurally parses propertySchema with legacy UP but create resolver rejects it", () => {
    const parsed = propertySchema.safeParse({
      name: "Test PG",
      address_line: "123 Test Street",
      city: "Noida",
      state: "UP",
      pincode: "201301",
      status: "active",
      floor_count: 2,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(resolveStateForWrite(parsed.data.state, undefined, true).ok).toBe(false);
    }
  });

  it("rejects non-canonical resident state on create", () => {
    expect(
      residentCreateDetailsSchema.safeParse({
        full_name: "Rahul Sharma",
        mobile: "9876543210",
        state: "UP",
      }).success
    ).toBe(false);
    expect(
      residentCreateDetailsSchema.safeParse({
        full_name: "Rahul Sharma",
        mobile: "+91 9876543210",
        state: "Uttar Pradesh",
      }).success
    ).toBe(true);
  });
});
