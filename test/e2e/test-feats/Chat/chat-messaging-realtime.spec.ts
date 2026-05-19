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

test.describe("chat realtime messaging", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test("buyer sees seller message via websocket without reload", async ({
    browser,
  }) => {
    const buyerContext = await browser.newContext();
    const sellerContext = await browser.newContext();

    await buyerContext.addInitScript((token: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", token);
    }, e2eToken);

    await sellerContext.addInitScript((token: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", token);
    }, e2eSellerToken);

    const buyerPage = await buyerContext.newPage();
    const sellerPage = await sellerContext.newPage();

    const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
    await waitForChatThread(buyerPage);

    const unique = `e2e-msg-${Date.now()}`;
    await openChatThread(sellerPage, threadId);
    await sendChatMessageViaUI(sellerPage, unique);

    await expect(buyerPage.getByText(unique)).toBeVisible({ timeout: 25_000 });

    await buyerContext.close();
    await sellerContext.close();
  });
});
