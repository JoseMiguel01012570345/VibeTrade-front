import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const CATALOG_SEARCH_STATE_KEY = "vt:catalogSearch:v4";

/** Avoid restoring a stale `status: "loading"` from sessionStorage between runs. */
export async function clearCatalogSearchPersistence(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    sessionStorage.removeItem(key);
  }, CATALOG_SEARCH_STATE_KEY);
}

export async function waitForCatalogSearchSettled(page: Page): Promise<void> {
  await expect(page.getByText(/^buscando/i)).toBeHidden({ timeout: 30_000 });
  await expect(
    page
      .getByText(/sin resultados para esta búsqueda/i)
      .or(page.locator(".grid").filter({ has: page.locator("a") }).first())
      .or(page.getByText(/no se pudo buscar/i))
      .or(
        page.getByText(/elige filtros y pulsa la lupa para ver resultados/i),
      ),
  ).toBeVisible({ timeout: 15_000 });
}

export async function waitForHomeFeedReady(page: Page): Promise<void> {
  await expect(
    page.getByLabel(/feed de ofertas por lotes/i),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/cargando recomendaciones/i)).toBeHidden({
    timeout: 30_000,
  });
  await expect(
    page.getByText(/actualizando el feed|descargando el siguiente bloque/i),
  ).toBeHidden({ timeout: 30_000 });
}

/** Home card like control exposes count as name; `title` holds Me gusta / Quitar me gusta. */
export function homeFeedLikeButton(page: Page) {
  return page
    .locator("[data-home-offers-scroll]")
    .locator('button[title="Me gusta"], button[title="Quitar me gusta"]')
    .first();
}
