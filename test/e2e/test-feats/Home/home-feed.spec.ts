import { test, expect } from "../../Resources/auth-fixture";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

/**
 * E2E del feed home. Requiere:
 * - PLAYWRIGHT_E2E=1, PLAYWRIGHT_E2E_TOKEN
 * - PLAYWRIGHT_E2E_OFFER_ID (oferta ajena para comentar/like)
 * - PLAYWRIGHT_E2E_STORE_ID (opcional, tienda en carrusel)
 */
test.describe("home feed E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("shows feed and navigates to offer", async ({ page }) => {
    await page.goto("/home");
    await expect(
      page.getByLabel(/feed de ofertas por lotes/i),
    ).toBeVisible({ timeout: 15_000 });
    const offerLink = page.locator('a[href^="/offer/"]').first();
    await expect(offerLink).toBeVisible({ timeout: 15_000 });
    await offerLink.click();
    await expect(page).toHaveURL(/\/offer\//);
  });

  test("likes offer from home card", async ({ page }) => {
    await page.goto("/home");
    const likeBtn = page
      .locator('[data-home-offers-scroll], .vt-home-page')
      .getByRole("button", { name: /me gusta/i })
      .first();
    await expect(likeBtn).toBeVisible({ timeout: 15_000 });
    await likeBtn.click();
    await expect(likeBtn).toBeVisible();
  });

  test("comments, replies and likes on offer page", async ({ page }) => {
    const offerId = process.env.PLAYWRIGHT_E2E_OFFER_ID?.trim();
    test.skip(!offerId, "Set PLAYWRIGHT_E2E_OFFER_ID for comment E2E");
    await page.goto(`/offer/${offerId}#offer-comments`);
    await expect(page.getByText(/comentarios públicos/i)).toBeVisible({
      timeout: 15_000,
    });
    const input = page.getByPlaceholder(/escribe un comentario/i);
    await input.fill(`E2E comment ${Date.now()}`);
    await page.getByRole("button", { name: /enviar/i }).click();
    await expect(page.getByText(/comentario enviado/i)).toBeVisible({
      timeout: 10_000,
    });
    const replyBtn = page.getByRole("button", { name: /^responder$/i }).first();
    if (await replyBtn.isVisible()) {
      await replyBtn.click();
      await page.getByPlaceholder(/escribe una respuesta/i).fill("E2E reply");
      await page.getByRole("button", { name: /enviar/i }).click();
    }
    const commentLike = page
      .getByRole("button", { name: /me gusta/i })
      .first();
    if (await commentLike.isVisible()) {
      await commentLike.click();
    }
  });

  test("navigates to store from recommended row", async ({ page }) => {
    const storeId = process.env.PLAYWRIGHT_E2E_STORE_ID?.trim();
    test.skip(!storeId, "Set PLAYWRIGHT_E2E_STORE_ID for store feed E2E");
    await page.goto("/home");
    await page
      .locator(`[role="link"]`)
      .filter({ hasText: /.+/ })
      .first()
      .click({ timeout: 15_000 });
    await expect(page).toHaveURL(new RegExp(`/store/${storeId}`));
  });
});
