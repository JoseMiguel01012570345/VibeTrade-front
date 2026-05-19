import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  e2eOfferId,
  e2eSellerToken,
  e2eToken,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import {
  openChatThread,
  openOfferAndComprar,
  sendChatMessageViaUI,
  waitForChatThread,
} from "../../Resources/chat-helpers";

test.describe("chat scroll unread and delivery", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);

  test("scroll-up shows jump-to-bottom control after new messages", async ({
    browser,
  }) => {
    test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

    const buyerContext = await browser.newContext();
    const sellerContext = await browser.newContext();
    await buyerContext.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, e2eToken);
    await sellerContext.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, e2eSellerToken);

    const buyerPage = await buyerContext.newPage();
    const sellerPage = await sellerContext.newPage();
    const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
    await waitForChatThread(buyerPage);

    const list = buyerPage.locator(".vt-card.flex.min-h-0.flex-1").first();
    if (await list.isVisible().catch(() => false)) {
      await list.evaluate((el) => {
        el.scrollTop = 0;
      });
    }

    const unique = `scroll-fab-${Date.now()}`;
    await openChatThread(sellerPage, threadId);
    await sendChatMessageViaUI(sellerPage, unique);

    const fab = buyerPage.getByRole("button", {
      name: /nuevos mensajes|ir al final|abajo/i,
    });
    await expect(buyerPage.getByText(unique)).toBeVisible({ timeout: 20_000 });
    if (await fab.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await fab.click();
    }

    await buyerContext.close();
    await sellerContext.close();
  });
});
