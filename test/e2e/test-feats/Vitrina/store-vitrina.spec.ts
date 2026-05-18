import { test, expect } from "@playwright/test";

test.describe("store vitrina public E2E", () => {
  test("public store vitrina route loads", async ({ page }) => {
    const storeId = process.env.PLAYWRIGHT_E2E_STORE_ID?.trim() ?? "demo-store";
    await page.goto(`/store/${storeId}/vitrina`);
    await expect(page).toHaveURL(new RegExp(`/store/${storeId}/vitrina`));
  });
});
