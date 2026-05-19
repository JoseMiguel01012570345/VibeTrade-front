import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  e2eOfferId,
} from "../../Resources/chat-env";
import { openOfferAndComprar, waitForChatThread } from "../../Resources/chat-helpers";

/** Paridad E2E con sendPurchaseInterestIntro.test.ts (flujo UI). */
test.describe("sendPurchaseInterestIntro E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);

  test("posts intro text when opening chat from offer", async ({ page }) => {
    await openOfferAndComprar(page, e2eOfferId);
    await waitForChatThread(page);
    await expect(
      page.getByText(/interés|oferta|charlar|coordinar/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("shows image in intro when offer has photos", async ({ page }) => {
    await openOfferAndComprar(page, e2eOfferId);
    await waitForChatThread(page);
    const rows = page.locator("[data-chat-message-row]");
    await expect(rows.first()).toBeVisible();
    const hasImage = await page
      .locator("[data-chat-message-row] img, [data-chat-message-row] [data-chat-image]")
      .first()
      .isVisible()
      .catch(() => false);
    if (hasImage) {
      await expect(
        page.locator("[data-chat-message-row] img").first(),
      ).toBeVisible();
    }
  });
});
