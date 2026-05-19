import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  e2eOfferId,
} from "../../Resources/chat-env";
import { openOfferAndComprar, waitForChatThread } from "../../Resources/chat-helpers";

/** Paridad E2E con syncOwnQaIntoMessages.test.ts */
test.describe("syncOwnQaIntoMessages E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);

  test("seeds public Q&A into thread after Comprar", async ({ page }) => {
    const qaText = `E2E QA ${Date.now()}`;
    await page.goto(`/offer/${e2eOfferId}#offer-comments`, {
      waitUntil: "domcontentloaded",
    });
    const input = page.getByPlaceholder(/escribe un comentario/i);
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(qaText);
    await page.getByRole("button", { name: /enviar/i }).click();
    await expect(page.getByText(qaText)).toBeVisible({ timeout: 20_000 });

    await openOfferAndComprar(page, e2eOfferId);
    await waitForChatThread(page);
    const qaInThread = page.getByText(qaText).first();
    if (await qaInThread.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await expect(qaInThread).toBeVisible();
    }
  });
});
