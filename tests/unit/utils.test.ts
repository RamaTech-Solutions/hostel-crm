import { describe, it, expect } from "vitest";
import { maskIdNumber, formatCurrency, calculateOccupancy, getInitials } from "@/lib/utils";

describe("utils", () => {
  it("masks ID numbers", () => {
    expect(maskIdNumber("1234-5678-9012")).toBe("**********9012");
    expect(maskIdNumber(null)).toBe("—");
  });

  it("formats currency in INR", () => {
    expect(formatCurrency(8500)).toContain("8,500");
  });

  it("calculates occupancy", () => {
    expect(calculateOccupancy(17, 20)).toBe(85);
    expect(calculateOccupancy(0, 0)).toBe(0);
  });

  it("gets initials", () => {
    expect(getInitials("Rahul Sharma")).toBe("RS");
  });
});
