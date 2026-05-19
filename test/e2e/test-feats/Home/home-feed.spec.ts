import { test, expect } from "../../Resources/auth-fixture";
import { resolveOfferId } from "../../Resources/e2e-discovery";
import {
  homeFeedLikeButton,
  waitForHomeFeedReady,
} from "../../Resources/e2e-page-helpers";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

test.describe("home feed E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("shows feed and navigates to offer", async ({ page }) => {
    await page.goto("/home");
    await waitForHomeFeedReady(page);
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
    test.setTimeout(60_000);
    const offerId = await resolveOfferId(page);
    test.skip(!offerId, "No offer found on home feed; seed data or set PLAYWRIGHT_E2E_OFFER_ID");
    await page.goto(`/offer/${offerId}#offer-comments`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(/comentarios públicos/i)).toBeVisible({
      timeout: 15_000,
    });
    const input = page.getByPlaceholder(/escribe un comentario/i);
    const commentText = `E2E comment ${Date.now()}`;
    await input.fill(commentText);
    await page.getByRole("button", { name: /enviar/i }).click();
    await expect(page.getByText(commentText).first()).toBeVisible({
      timeout: 20_000,
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
    await page.goto("/home");
    await waitForHomeFeedReady(page);
    const storeCard = page
      .getByRole("list", { name: /tiendas recomendadas/i })
      .getByRole("link")
      .first();
    const hasStoreCard = await storeCard
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    test.skip(
      !hasStoreCard,
      "No recommended stores on home feed; seed data or set PLAYWRIGHT_E2E_STORE_ID",
    );
    await storeCard.scrollIntoViewIfNeeded();
    await storeCard.click({ noWaitAfter: true });
    await expect(page).toHaveURL(/\/store\/[^/#?]+/, { timeout: 20_000 });
  });
});
