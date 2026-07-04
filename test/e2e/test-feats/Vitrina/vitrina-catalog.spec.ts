import { test, expect } from "@playwright/test";
import {
  chatE2EReady,
  chatE2ESkipReason,
  getE2EScenario,
} from "../../Resources/chat-env";

/** Paridad E2E con storefront (StorefrontPage + StorefrontProductCard): catálogo público. */
test.describe("store storefront catalog E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);

  test("shows published products on public storefront", async ({ page }) => {
    const scenario = getE2EScenario()!;
    await page.goto(`/store/${scenario.storeId}`);
    await expect(page.getByText(/producto e2e/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("filters products by name on public storefront", async ({ page }) => {
    const scenario = getE2EScenario()!;
    await page.goto(`/store/${scenario.storeId}`);
    const search = page.getByPlaceholder(/qué estás buscando/i);
    if (await search.isVisible().catch(() => false)) {
      await search.fill("Producto E2E");
      await expect(page.getByText(/producto e2e/i).first()).toBeVisible();
      await search.fill("zzzz-no-match");
      await expect(page.getByText(/producto e2e/i)).toHaveCount(0, {
        timeout: 10_000,
      });
    }
  });

  test("offer page shows engagement metrics", async ({ page }) => {
    const scenario = getE2EScenario()!;
    await page.goto(`/offer/${scenario.offerId}`);
    await expect(
      page.getByText(/comentario|me gusta/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
