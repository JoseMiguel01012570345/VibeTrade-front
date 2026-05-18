import { test, expect } from "../../Resources/auth-fixture";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

/**
 * E2E búsqueda /search. Requiere PLAYWRIGHT_E2E=1 y PLAYWRIGHT_E2E_TOKEN.
 */
test.describe("catalog search E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("search by query shows coherent results", async ({ page }) => {
    await page.goto("/search");
    await page.getByLabel(/buscar en catálogo/i).fill("a");
    await page.getByRole("button", { name: /buscar/i }).click();
    await expect(page.getByText(/buscando/i)).toBeHidden({ timeout: 15_000 });
    const empty = page.getByText(/sin resultados/i);
    const grid = page.locator(".grid").filter({ has: page.locator("a") });
    await expect(empty.or(grid.first())).toBeVisible({ timeout: 15_000 });
  });

  test("product filter search", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("button", { name: /filtrar por tipo/i }).click();
    await page.getByRole("option", { name: /^tiendas$/i }).click();
    await page.getByRole("option", { name: /^servicios$/i }).click();
    await page.getByRole("option", { name: /^hojas de ruta$/i }).click();
    await page.getByRole("button", { name: /buscar/i }).click();
    await expect(page.getByText(/buscando/i)).toBeHidden({ timeout: 15_000 });
  });

  test("pagination Siguiente and Anterior when has more", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("button", { name: /buscar/i }).click();
    await expect(page.getByText(/buscando/i)).toBeHidden({ timeout: 15_000 });
    const next = page.getByRole("button", { name: /página siguiente/i });
    if (await next.isEnabled()) {
      await next.click();
      await expect(page.getByText(/buscando/i)).toBeHidden({ timeout: 15_000 });
      const prev = page.getByRole("button", { name: /página anterior/i });
      await expect(prev).toBeEnabled();
      await prev.click();
    }
  });
});
