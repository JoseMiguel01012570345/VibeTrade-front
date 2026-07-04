import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  e2eOfferId,
  getE2ESellerSession,
  getE2EToken,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import {
  buyerRespondToAgreement,
  createThreadAsBuyer,
  openSellerPage,
  sellerEmitServiceAgreement,
} from "../../Resources/agreement-ui-helpers";
import {
  reloadChatThread,
  sendChatMessageViaUI,
  waitForAgreementBubble,
  waitForChatReady,
} from "../../Resources/chat-helpers";

/** Paridad E2E: respuesta de texto a mensajes de tipo agreement (no accept/reject). */
test.describe("chat agreement reply E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test("buyer sends text reply to agreement message", async ({ browser }) => {
    test.setTimeout(120_000);
    const seller = getE2ESellerSession()!;
    const title = `E2E Agreement Reply ${Date.now()}`;

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
    
    // Seller emits an agreement
    await sellerEmitServiceAgreement(sellerPage, {
      title,
      serviceNamePart: "Consultoría E2E",
    });

    // Buyer waits for agreement to appear
    await waitForAgreementBubble(buyerPage, title);
    
    // Buyer clicks on the agreement message to select it for reply
    const agreementRow = buyerPage
      .locator("[data-chat-message-row]")
      .filter({ hasText: title })
      .first();
    await expect(agreementRow).toBeVisible({ timeout: 25_000 });
    await agreementRow.click();

    // Verify the reply composer component appears showing the quoted message
    const replyComposer = buyerPage.getByRole("region", {
      name: /respondiendo a mensajes en un hilo nuevo/i,
    });
    await expect(replyComposer).toBeVisible({ timeout: 10_000 });
    await expect(replyComposer.getByText(/nuevo hilo/i)).toBeVisible();
    await expect(
      replyComposer.getByText(/citas en este hilo \(1\)/i),
    ).toBeVisible();

    // Buyer sends a text reply to the agreement
    const replyText = `Tengo una pregunta sobre este acuerdo: ${Date.now()}`;
    await sendChatMessageViaUI(buyerPage, replyText);

    // Verify the reply appears
    await expect(buyerPage.getByText(replyText).first()).toBeVisible();
    
    // Verify the original agreement is still visible
    await expect(
      buyerPage.locator("[data-chat-agreement]").filter({ hasText: title }),
    ).toBeVisible();

    // Seller verifies they received the reply
    await reloadChatThread(sellerPage);
    await waitForChatReady(sellerPage);
    await expect(sellerPage.getByText(replyText).first()).toBeVisible({
      timeout: 20_000,
    });

    await sellerPage.close();
    await buyerPage.context().close();
  });

  test("seller sends text reply to agreement message", async ({ browser }) => {
    test.setTimeout(120_000);
    const seller = getE2ESellerSession()!;
    const title = `E2E Seller Reply ${Date.now()}`;

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
    
    // Seller emits an agreement
    await sellerEmitServiceAgreement(sellerPage, {
      title,
      serviceNamePart: "Consultoría E2E",
    });

    // Buyer accepts the agreement first
    await waitForAgreementBubble(buyerPage, title);
    await buyerRespondToAgreement(buyerPage, title, "accept");

    // Seller clicks on their own agreement message to reply
    await reloadChatThread(sellerPage);
    const agreementRow = sellerPage
      .locator("[data-chat-message-row]")
      .filter({ hasText: title })
      .first();
    await expect(agreementRow).toBeVisible({ timeout: 25_000 });
    await agreementRow.click();

    // Verify the reply composer component appears showing the quoted message
    const replyComposer = sellerPage.getByRole("region", {
      name: /respondiendo a mensajes en un hilo nuevo/i,
    });
    await expect(replyComposer).toBeVisible({ timeout: 10_000 });
    await expect(replyComposer.getByText(/nuevo hilo/i)).toBeVisible();
    await expect(
      replyComposer.getByText(/citas en este hilo \(1\)/i),
    ).toBeVisible();

    // Seller sends a text reply to the agreement
    const replyText = `Confirmo los detalles del acuerdo: ${Date.now()}`;
    await sendChatMessageViaUI(sellerPage, replyText);

    // Verify the reply appears
    await expect(sellerPage.getByText(replyText).first()).toBeVisible();
    
    // Verify the original agreement is still visible
    await expect(
      sellerPage.locator("[data-chat-agreement]").filter({ hasText: title }),
    ).toBeVisible();

    // Buyer verifies they received the reply
    await reloadChatThread(buyerPage);
    await waitForChatReady(buyerPage);
    await expect(buyerPage.getByText(replyText).first()).toBeVisible({
      timeout: 20_000,
    });

    await sellerPage.close();
    await buyerPage.context().close();
  });

  test("buyer replies to agreement with clarification question", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const seller = getE2ESellerSession()!;
    const title = `E2E Clarification ${Date.now()}`;

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
    
    // Seller emits an agreement
    await sellerEmitServiceAgreement(sellerPage, {
      title,
      serviceNamePart: "Consultoría E2E",
    });

    // Buyer waits for agreement and clicks to reply
    await waitForAgreementBubble(buyerPage, title);
    const agreementRow = buyerPage
      .locator("[data-chat-message-row]")
      .filter({ hasText: title })
      .first();
    await agreementRow.click();

    // Verify the reply composer component appears showing the quoted message
    const replyComposer = buyerPage.getByRole("region", {
      name: /respondiendo a mensajes en un hilo nuevo/i,
    });
    await expect(replyComposer).toBeVisible({ timeout: 10_000 });
    await expect(replyComposer.getByText(/nuevo hilo/i)).toBeVisible();
    await expect(
      replyComposer.getByText(/citas en este hilo \(1\)/i),
    ).toBeVisible();

    // Buyer sends a clarification question
    const clarification = `¿Podrías aclarar el plazo de entrega? ${Date.now()}`;
    await sendChatMessageViaUI(buyerPage, clarification);

    // Verify clarification appears
    await expect(buyerPage.getByText(clarification).first()).toBeVisible();

    // Seller responds to the clarification
    await reloadChatThread(sellerPage);
    await waitForChatReady(sellerPage);
    await expect(sellerPage.getByText(clarification).first()).toBeVisible({
      timeout: 20_000,
    });

    const response = `El plazo es de 5 días hábiles. ${Date.now()}`;
    await sendChatMessageViaUI(sellerPage, response);
    await expect(sellerPage.getByText(response).first()).toBeVisible();

    // Buyer sees seller's response
    await reloadChatThread(buyerPage);
    await waitForChatReady(buyerPage);
    await expect(buyerPage.getByText(response).first()).toBeVisible({
      timeout: 20_000,
    });

    await sellerPage.close();
    await buyerPage.context().close();
  });
});
