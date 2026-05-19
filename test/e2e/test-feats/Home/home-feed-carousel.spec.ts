import { test, expect } from "../../Resources/auth-fixture";
import { waitForHomeFeedReady } from "../../Resources/e2e-page-helpers";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

/**
 * Paridad E2E parcial con homeFeedMerge / homePage.feed (carrusel con varios bloques).
 * Se omite si el feed solo tiene un bloque visible.
 */
test.describe("homeFeedMerge carousel E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("feed viewport is ready for carousel interaction", async ({ page }) => {
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await waitForHomeFeedReady(page);
    const feed = page.getByLabel(/feed de ofertas por lotes/i);
    await expect(feed).toBeVisible();
    const dots = page.locator("[data-home-offers-scroll]");
    const count = await dots.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
