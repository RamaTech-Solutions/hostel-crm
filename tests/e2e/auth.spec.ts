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
    await expect(page.getByLabel("Full Name")).toBeVisible();
    await expect(page.getByLabel("Business / PG Name")).toBeVisible();
  });
});
