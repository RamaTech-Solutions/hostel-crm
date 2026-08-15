import { describe, expect, it } from "vitest";
import { assertDemoSeedTarget, supabaseProjectRefFromUrl } from "@/lib/supabase-project-ref";

describe("supabaseProjectRefFromUrl", () => {
  it("reads the project ref from a hosted URL", () => {
    expect(supabaseProjectRefFromUrl("https://abcd1234.supabase.co")).toBe("abcd1234");
  });

  it("returns null for non-supabase hosts", () => {
    expect(supabaseProjectRefFromUrl("https://example.com")).toBeNull();
  });
});

describe("assertDemoSeedTarget", () => {
  const staging = "https://stagingref.supabase.co";

  it("requires ALLOW_DEMO_SEED and matching confirm ref", () => {
    expect(
      assertDemoSeedTarget({
        supabaseUrl: staging,
        allowDemoSeed: undefined,
        confirmRef: "stagingref",
        productionRef: "prodref",
      }).ok
    ).toBe(false);
    expect(
      assertDemoSeedTarget({
        supabaseUrl: staging,
        allowDemoSeed: "1",
        confirmRef: "otherref",
        productionRef: "prodref",
      }).ok
    ).toBe(false);
    expect(
      assertDemoSeedTarget({
        supabaseUrl: staging,
        allowDemoSeed: "1",
        confirmRef: "stagingref",
        productionRef: "prodref",
      })
    ).toEqual({ ok: true, ref: "stagingref" });
  });

  it("aborts production even when ALLOW_DEMO_SEED is set", () => {
    const result = assertDemoSeedTarget({
      supabaseUrl: "https://prodref.supabase.co",
      allowDemoSeed: "1",
      confirmRef: "prodref",
      productionRef: "prodref",
    });
    expect(result.ok).toBe(false);
  });
});
