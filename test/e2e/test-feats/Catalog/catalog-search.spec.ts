import { test, expect } from "../../Resources/auth-fixture";
import {
  clearCatalogSearchPersistence,
  waitForCatalogSearchSettled,
} from "../../Resources/e2e-page-helpers";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

test.describe("catalog search E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test.beforeEach(async ({ page }) => {
    await clearCatalogSearchPersistence(page);
  });

  test("search by query shows coherent results", async ({ page }) => {
    await page.goto("/search");
    await page.getByLabel(/buscar en catálogo/i).fill("yogurt");
    await page.getByRole("button", { name: /buscar/i }).click();
    await waitForCatalogSearchSettled(page);
  });

  test("product filter search", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("button", { name: /filtrar por tipo/i }).click();
    await page.getByRole("option", { name: /^tiendas$/i }).click();
    await page.getByRole("option", { name: /^servicios$/i }).click();
    await page.getByRole("option", { name: /^hojas de ruta$/i }).click();
    await page.getByRole("button", { name: /buscar/i }).click();
    await waitForCatalogSearchSettled(page);
  });

  test("pagination Siguiente and Anterior when has more", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("button", { name: /buscar/i }).click();
    await waitForCatalogSearchSettled(page);
    const next = page.getByRole("button", { name: /página siguiente/i });
    if (await next.isEnabled()) {
      await next.click();
      await waitForCatalogSearchSettled(page);
      const prev = page.getByRole("button", { name: /página anterior/i });
      await expect(prev).toBeEnabled();
      await prev.click();
    }
  });
});
