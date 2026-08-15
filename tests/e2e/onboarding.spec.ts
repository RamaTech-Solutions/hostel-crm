import { test, expect } from "@playwright/test";

test.describe("onboarding", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("unauthenticated onboarding is usable as a login redirect on mobile", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/login/);
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    expect(overflow).toBe(false);
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
  });
});
