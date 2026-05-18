import { test, expect } from "../../Resources/auth-fixture";
import { resolveOfferId, resolveStoreId } from "../../Resources/e2e-discovery";
import {
  homeFeedLikeButton,
  waitForHomeFeedReady,
} from "../../Resources/e2e-page-helpers";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

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
    await waitForHomeFeedReady(page);
    const likeBtn = homeFeedLikeButton(page);
    await likeBtn.scrollIntoViewIfNeeded();
    await expect(likeBtn).toBeVisible({ timeout: 15_000 });
    const titleBefore = await likeBtn.getAttribute("title");
    await likeBtn.click();
    await expect(likeBtn).toHaveAttribute(
      "title",
      titleBefore === "Me gusta" ? "Quitar me gusta" : "Me gusta",
      { timeout: 10_000 },
    );
  });

  test("comments, replies and likes on offer page", async ({ page }) => {
    const offerId = await resolveOfferId(page);
    test.skip(!offerId, "No offer found on home feed; seed data or set PLAYWRIGHT_E2E_OFFER_ID");
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
    const storeId = await resolveStoreId(page);
    test.skip(!storeId, "No store found on home feed; seed data or set PLAYWRIGHT_E2E_STORE_ID");
    await expect(page).toHaveURL(new RegExp(`/store/${storeId}`));
  });
});
