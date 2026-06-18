import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  e2eOfferId,
  e2eSellerToken,
  e2eToken,
  getE2EScenario,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import {
  expectedBuyerChatTitle,
  expectedSellerChatTitle,
  fetchE2EOfferCard,
  fetchE2EPublicUserName,
} from "../../Resources/e2e-chat-labels";
import {
  openChatPeoplePanel,
  openChatThread,
  openOfferAndComprar,
  leaveChatFromListUI,
  readChatHeaderTitle,
  readIntegrantesCount,
  expectParticipantRoleVisible,
  waitForChatThread,
} from "../../Resources/chat-helpers";

function injectSession(
  context: { addInitScript: (fn: (t: string) => void, arg: string) => Promise<void> },
  token: string,
): Promise<void> {
  return context.addInitScript((t: string) => {
    sessionStorage.setItem("vt_session_active", "1");
    sessionStorage.setItem("vt_session_token", t);
  }, token);
}

test.describe("chat participants leave and header title", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test("header shows store·product for buyer and buyer·product for seller", async ({
    browser,
  }) => {
    const scenario = getE2EScenario();
    const { storeName, offerTitle } = await fetchE2EOfferCard(e2eOfferId);
    expect(storeName.length).toBeGreaterThan(0);
    expect(offerTitle.length).toBeGreaterThan(0);

    const buyerName = scenario?.buyerUserId
      ? await fetchE2EPublicUserName(scenario.buyerUserId)
      : "Comprador";

    const buyerCtx = await browser.newContext();
    const sellerCtx = await browser.newContext();
    await injectSession(buyerCtx, e2eToken);
    await injectSession(sellerCtx, e2eSellerToken);

    const buyerPage = await buyerCtx.newPage();
    const sellerPage = await sellerCtx.newPage();

    try {
      const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
      await waitForChatThread(buyerPage);

      await expect
        .poll(() => readChatHeaderTitle(buyerPage), { timeout: 15_000 })
        .toBe(expectedBuyerChatTitle(storeName, offerTitle));

      await openChatThread(sellerPage, threadId);
      await expect
        .poll(() => readChatHeaderTitle(sellerPage), { timeout: 15_000 })
        .toBe(expectedSellerChatTitle(buyerName, offerTitle));
    } finally {
      await buyerCtx.close();
      await sellerCtx.close();
    }
  });

  test("integrantes hides buyer or seller after they leave the thread", async ({
    browser,
  }) => {
    const buyerCtx = await browser.newContext();
    const sellerCtx = await browser.newContext();
    await injectSession(buyerCtx, e2eToken);
    await injectSession(sellerCtx, e2eSellerToken);

    const buyerPage = await buyerCtx.newPage();
    const sellerPage = await sellerCtx.newPage();

    try {
      const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
      await waitForChatThread(buyerPage);
      await openChatThread(sellerPage, threadId);
      await waitForChatThread(sellerPage);

      await openChatPeoplePanel(buyerPage);
      await expect.poll(() => readIntegrantesCount(buyerPage)).toBe(2);
      await expectParticipantRoleVisible(buyerPage, "Comprador", true);
      await expectParticipantRoleVisible(buyerPage, "Vendedor", true);

      await leaveChatFromListUI(sellerPage, threadId);

      await expect(buyerPage.getByText(/salió del chat/i)).toBeVisible({
        timeout: 25_000,
      });
      await expect.poll(() => readIntegrantesCount(buyerPage)).toBe(1);
      await expectParticipantRoleVisible(buyerPage, "Comprador", true);
      await expectParticipantRoleVisible(buyerPage, "Vendedor", false);
    } finally {
      await buyerCtx.close();
      await sellerCtx.close();
    }
  });
});
