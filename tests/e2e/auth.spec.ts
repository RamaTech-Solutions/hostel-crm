import { test, expect } from "@playwright/test";

test.describe("PG CRM", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /PG Management CRM/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("shows demo credentials hint", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("owner@demo-hostel.com")).toBeVisible();
  });
});
