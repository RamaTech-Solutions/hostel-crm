import { test, expect } from "@playwright/test";

test.describe("Awaasly", () => {
  test("landing page is public", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Run all your PGs from one place/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Start Free/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Explore Demo/i }).first()).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("shows demo dashboard link", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /Explore Demo/i })).toBeVisible();
  });

  test("signup page uses Awaasly branding", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: /Awaasly/i })).toBeVisible();
    await expect(page.getByLabel(/Mobile Number/i)).toBeVisible();
    await expect(page.getByLabel("Business / PG Name")).toBeVisible();
    await expect(page.getByText("Password requirements")).toBeVisible();
  });

  test("login has forgot password link", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /Forgot password/i })).toBeVisible();
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: /Forgot password/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("reset password without session shows expired state", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Request a New Reset Link/i })).toBeVisible();
  });

  test("check email page loads", async ({ page }) => {
    await page.goto("/signup/check-email");
    await expect(page.getByRole("heading", { name: /Check your email/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to Login/i })).toBeVisible();
  });

  test("onboarding requires auth", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/login/);
  });

  test("document content is not public", async ({ request }) => {
    const response = await request.get("/api/documents/33333333-3333-4333-8333-333333333333/content");
    expect(response.status()).toBe(401);
    expect(response.headers()["content-type"] ?? "").toMatch(/json/);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
