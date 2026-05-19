import { test, expect } from "../../Resources/auth-fixture";
import {
  clearCatalogSearchPersistence,
  waitForCatalogSearchSettled,
} from "../../Resources/e2e-page-helpers";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

/** Paridad E2E con catalogSearchPage (category, trust, geo filters). */
test.describe("catalogSearchPage filters E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test.beforeEach(async ({ page }) => {
    await clearCatalogSearchPersistence(page);
  });

  test("passes category and trust filters to search", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 4.6, longitude: -74.1 });
    await page.goto("/search");
    await page.getByRole("button", { name: /filtrar por categorías/i }).click();
    const cat = page.getByRole("option", { name: /electrónica|mercancías|servicios/i }).first();
    if (await cat.isVisible().catch(() => false)) {
      await cat.click();
    }
    const trust = page.getByLabel(/confianza mínima/i);
    if (await trust.isVisible().catch(() => false)) {
      await trust.fill("50");
    }
    const km = page.getByLabel(/radio de búsqueda/i);
    if (await km.isVisible().catch(() => false)) {
      await km.fill("10");
    }
    await page.getByRole("button", { name: /buscar/i }).click();
    await waitForCatalogSearchSettled(page);
  });
});
