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
  waitForChatReady,
} from "../../Resources/chat-helpers";

/** Paridad E2E con chatMerge.replies (selección + respuesta en hilo). */
test.describe("chatMerge replies E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test("sends text reply quoting a prior message", async ({ browser }) => {
    test.setTimeout(90_000);
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
    await waitForChatReady(sellerPage);
    const original = `E2E reply target ${Date.now()}`;
    await sendChatMessageViaUI(sellerPage, original);

    await waitForChatReady(buyerPage);
    const targetRow = buyerPage
      .locator("[data-chat-message-row]")
      .filter({ hasText: original })
      .first();
    await expect(targetRow).toBeVisible({ timeout: 20_000 });
    await targetRow.click();
    const replyText = `E2E reply body ${Date.now()}`;
    await sendChatMessageViaUI(buyerPage, replyText);
    await expect(buyerPage.getByText(replyText).first()).toBeVisible();
    await expect(
      buyerPage.getByText(original).first(),
    ).toBeVisible();

    await buyerCtx.close();
    await sellerCtx.close();
  });
});
