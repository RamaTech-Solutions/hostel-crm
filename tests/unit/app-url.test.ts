import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppUrl, getDemoHref, getPublicSignupHref } from "@/lib/app-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAppUrl", () => {
  it("does not fall back to the production hostname", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(getAppUrl()).toBe("http://localhost:3000");
    expect(getAppUrl()).not.toBe("https://hostel-crm.vercel.app");
  });

  it("uses the configured app URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://staging.example/");
    expect(getAppUrl()).toBe("https://staging.example");
  });
});

describe("getDemoHref", () => {
  it("defaults to /demo", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_URL", "");
    expect(getDemoHref()).toBe("/demo");
  });

  it("uses an absolute staging demo URL when configured", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_URL", "https://staging.example/demo/");
    expect(getDemoHref()).toBe("https://staging.example/demo");
  });
});

describe("getPublicSignupHref", () => {
  it("defaults to /signup", () => {
    vi.stubEnv("NEXT_PUBLIC_PRIMARY_APP_URL", "");
    expect(getPublicSignupHref()).toBe("/signup");
  });

  it("points at production signup when primary app URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_PRIMARY_APP_URL", "https://hostel-crm.vercel.app");
    expect(getPublicSignupHref()).toBe("https://hostel-crm.vercel.app/signup");
  });
});
