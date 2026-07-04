import { test, expect } from "@playwright/test";

test.describe("store storefront public E2E", () => {
  test("legacy vitrina route redirects to the storefront", async ({ page }) => {
    const storeId = process.env.PLAYWRIGHT_E2E_STORE_ID?.trim() ?? "demo-store";
    await page.goto(`/store/${storeId}/vitrina`);
    // La ruta legada /vitrina ahora redirige al storefront /store/:id.
    await expect(page).toHaveURL(new RegExp(`/store/${storeId}(?:$|[?#])`));
  });
});
