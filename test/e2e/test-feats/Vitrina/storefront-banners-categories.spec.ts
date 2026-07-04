import { test, expect } from "@playwright/test";

test.describe("Storefront banners y categorías E2E", () => {
  test("storefront carga banner o hero y menú de categorías", async ({ page }) => {
    const storeId = process.env.PLAYWRIGHT_E2E_STORE_ID?.trim() ?? "demo-store";
    await page.goto(`/store/${storeId}`);
    await expect(
      page
        .getByRole("region", { name: /banner principal/i })
        .or(page.locator('[aria-label="Banner principal"]'))
        .first(),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Categorías" }).click();
    await expect(page.getByRole("dialog").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
