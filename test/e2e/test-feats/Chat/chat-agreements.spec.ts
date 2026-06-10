import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  e2eOfferId,
  getE2EScenario,
  getE2ESellerSession,
  getE2EToken,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import {
  buyerRespondToAgreement,
  createThreadAsBuyer,
  injectE2ESession,
  openAgreementDetailInRail,
  openSellerPage,
  sellerEditAgreementInRail,
  sellerEmitMerchandiseAgreement,
  sellerEmitServiceAgreement,
  SELLER_TRUST_PENALTY_PTS,
} from "../../Resources/agreement-ui-helpers";
import {
  reloadChatThread,
  waitForAgreementBubble,
} from "../../Resources/chat-helpers";
import { fetchStoreTrustScore } from "../../Resources/e2e-trust-api";

test.describe("chat agreements (UI + buyer respond)", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test("seller emits agreement, buyer accepts, rail lists it with PDF", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const title = `E2E Aceptar ${Date.now()}`;

    const { buyerPage, threadId } = await createThreadAsBuyer(
      browser,
      getE2EToken(),
      e2eOfferId,
    );

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await sellerEmitMerchandiseAgreement(sellerPage, {
      title,
      productNamePart: "Producto E2E",
    });

    await waitForAgreementBubble(buyerPage, title);
    await buyerRespondToAgreement(buyerPage, title, "accept");

    await openAgreementDetailInRail(buyerPage, title);
    await expect(buyerPage.getByText(/aceptado/i).first()).toBeVisible();

    await sellerPage.close();
    await buyerPage.context().close();
  });

  test("seller emits agreement and buyer rejects it", async ({ browser }) => {
    const seller = getE2ESellerSession()!;
    const title = `E2E Rechazar ${Date.now()}`;

    const { buyerPage, threadId } = await createThreadAsBuyer(
      browser,
      getE2EToken(),
      e2eOfferId,
    );
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await sellerEmitMerchandiseAgreement(sellerPage, {
      title,
      productNamePart: "Producto E2E",
    });

    await waitForAgreementBubble(buyerPage, title);
    await buyerRespondToAgreement(buyerPage, title, "reject");
    await expect(buyerPage.getByText(/rechazado/i).first()).toBeVisible();

    await sellerPage.close();
    await buyerPage.context().close();
  });

  test("seller emits agreement with two merchandise lines", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const title = `E2E Multi merch ${Date.now()}`;

    const { buyerPage, threadId } = await createThreadAsBuyer(
      browser,
      getE2EToken(),
      e2eOfferId,
    );
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );

    await sellerEmitMerchandiseAgreement(sellerPage, {
      title,
      productNamePart: "Producto E2E",
      secondProductNamePart: "Producto 2 E2E",
    });

    await waitForAgreementBubble(buyerPage, title);

    await openAgreementDetailInRail(buyerPage, title);
    await expect(
      buyerPage.getByText(/solo mercancías|mercancías/i).first(),
    ).toBeVisible();

    await sellerPage.close();
    await buyerPage.context().close();
  });

  test("buyer accepts, seller edits, buyer rejects again and store trust drops", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const title = `E2E Trust ${Date.now()}`;
    const revised = `${title} rev`;

    const sellerTrustCtx = await browser.newContext();
    await injectE2ESession(sellerTrustCtx, seller.sessionToken);
    const sellerTrustPage = await sellerTrustCtx.newPage();
    const trustBefore = await fetchStoreTrustScore(
      sellerTrustPage,
      scenario.storeId,
    );

    const { buyerPage, threadId } = await createThreadAsBuyer(
      browser,
      getE2EToken(),
      e2eOfferId,
    );
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );

    await sellerEmitMerchandiseAgreement(sellerPage, {
      title,
      productNamePart: "Producto E2E",
    });
    await reloadChatThread(buyerPage);
    await buyerRespondToAgreement(buyerPage, title, "accept");

    await reloadChatThread(sellerPage);
    await sellerEditAgreementInRail(sellerPage, title, revised, "Producto E2E");

    await reloadChatThread(buyerPage);
    await expect(
      buyerPage.getByText(/modificó el acuerdo/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    await buyerRespondToAgreement(buyerPage, revised, "reject");

    const trustAfter = await fetchStoreTrustScore(
      sellerTrustPage,
      scenario.storeId,
    );
    expect(trustAfter).toBe(trustBefore - SELLER_TRUST_PENALTY_PTS);

    await sellerPage.close();
    await buyerPage.context().close();
    await sellerTrustCtx.close();
  });

  test("buyer rejects, seller edits, buyer rejects again and store trust unchanged", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const title = `E2E NoTrust ${Date.now()}`;
    const revised = `${title} rev`;

    const sellerTrustCtx = await browser.newContext();
    await injectE2ESession(sellerTrustCtx, seller.sessionToken);
    const sellerTrustPage = await sellerTrustCtx.newPage();
    const trustBefore = await fetchStoreTrustScore(
      sellerTrustPage,
      scenario.storeId,
    );

    const { buyerPage, threadId } = await createThreadAsBuyer(
      browser,
      getE2EToken(),
      e2eOfferId,
    );
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );

    await sellerEmitMerchandiseAgreement(sellerPage, {
      title,
      productNamePart: "Producto E2E",
    });
    await reloadChatThread(buyerPage);
    await buyerRespondToAgreement(buyerPage, title, "reject");

    await reloadChatThread(sellerPage);
    await sellerEditAgreementInRail(sellerPage, title, revised, "Producto E2E");

    await reloadChatThread(buyerPage);
    await expect(
      buyerPage.getByText(/revisó el acuerdo/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    await buyerRespondToAgreement(buyerPage, revised, "reject");

    const trustAfter = await fetchStoreTrustScore(
      sellerTrustPage,
      scenario.storeId,
    );
    expect(trustAfter).toBe(trustBefore);

    await sellerPage.close();
    await buyerPage.context().close();
    await sellerTrustCtx.close();
  });

  test("seller emits service agreement and buyer accepts", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const seller = getE2ESellerSession()!;
    const title = `E2E Servicio ${Date.now()}`;

    const { buyerPage, threadId } = await createThreadAsBuyer(
      browser,
      getE2EToken(),
      e2eOfferId,
    );
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );

    await sellerEmitServiceAgreement(sellerPage, {
      title,
      serviceNamePart: "Consultoría E2E",
    });

    await waitForAgreementBubble(buyerPage, title);
    await buyerRespondToAgreement(buyerPage, title, "accept");

    await openAgreementDetailInRail(buyerPage, title);
    await expect(
      buyerPage.getByText(/solo servicios|servicios/i).first(),
    ).toBeVisible();

    await sellerPage.close();
    await buyerPage.context().close();
  });
});
