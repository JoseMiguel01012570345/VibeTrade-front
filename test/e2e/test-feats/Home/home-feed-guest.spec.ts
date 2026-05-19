import { test, expect } from "@playwright/test";
import {
  homeFeedLikeButton,
  waitForHomeFeedReady,
} from "../../Resources/e2e-page-helpers";

/** Paridad E2E con offerCardsChunk (guest like) y homePage.feed (sin sesión). */
test.describe("home feed guest E2E", () => {
  test("opens auth modal when guest likes", async ({ page }) => {
    await page.goto("/home");
    await waitForHomeFeedReady(page);
    const likeBtn = homeFeedLikeButton(page);
    await likeBtn.scrollIntoViewIfNeeded();
    await likeBtn.click();
    await expect(
      page.getByText(/inicia sesión|registr|onboarding/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("shows comment count on offer cards", async ({ page }) => {
    await page.goto("/home");
    await waitForHomeFeedReady(page);
    await expect(
      page.getByText(/\d+\s*comentario/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
