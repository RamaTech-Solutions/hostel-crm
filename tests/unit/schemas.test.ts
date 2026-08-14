import { describe, it, expect } from "vitest";
import { loginSchema, propertySchema } from "@/lib/validations/schemas";

describe("validation schemas", () => {
  it("validates login", () => {
    const result = loginSchema.safeParse({ email: "owner@demo.com", password: "Demo@12345" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid pincode", () => {
    const result = propertySchema.safeParse({
      name: "Test PG",
      address_line: "123 Test Street",
      city: "Noida",
      state: "UP",
      pincode: "123",
      status: "active",
      floor_count: 2,
    });
    expect(result.success).toBe(false);
  });
});
