import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  e2eOfferId,
  getE2ESellerToken,
  getE2EToken,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import {
  openChatThread,
  openOfferAndComprar,
  sendChatMessageViaUI,
} from "../../Resources/chat-helpers";

/** Paridad E2E con chatRealtime.store (delivery) y chatDeliveryAck. */
test.describe("chatRealtime delivery E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test("buyer message appears for seller without reload", async ({ browser }) => {
    const buyerCtx = await browser.newContext();
    await buyerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, getE2EToken());
    const buyerPage = await buyerCtx.newPage();
    const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);

    const sellerCtx = await browser.newContext();
    await sellerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, getE2ESellerToken());
    const sellerPage = await sellerCtx.newPage();
    await openChatThread(sellerPage, threadId);

    const msg = `E2E delivery ${Date.now()}`;
    await sendChatMessageViaUI(buyerPage, msg);
    await expect(sellerPage.getByText(msg).first()).toBeVisible({
      timeout: 25_000,
    });

    await buyerCtx.close();
    await sellerCtx.close();
  });
});
