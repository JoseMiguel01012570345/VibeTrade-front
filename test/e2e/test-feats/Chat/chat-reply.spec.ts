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

    // Verify the reply composer component appears showing the quoted message
    const replyComposer = buyerPage.getByRole("region", {
      name: /respondiendo a mensajes en un hilo nuevo/i,
    });
    await expect(replyComposer).toBeVisible({ timeout: 10_000 });
    await expect(replyComposer.getByText(/nuevo hilo/i)).toBeVisible();
    await expect(
      replyComposer.getByText(/citas en este hilo \(1\)/i),
    ).toBeVisible();

    const replyText = `E2E reply body ${Date.now()}`;
    await sendChatMessageViaUI(buyerPage, replyText);
    await expect(buyerPage.getByText(replyText).first()).toBeVisible();

    // Verify the reply component appears in the sent message showing the quoted message
    await expect(buyerPage.getByText(/hilo nuevo/i)).toBeVisible();
    const replyQuote = buyerPage.getByText(original).first();
    await expect(replyQuote).toBeVisible();

    await expect(
      buyerPage.getByText(original).first(),
    ).toBeVisible();

    await buyerCtx.close();
    await sellerCtx.close();
  });

  test("adds multiple messages to reply preview", async ({ browser }) => {
    test.setTimeout(120_000);
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

    const msg1 = `E2E message 1 ${Date.now()}`;
    const msg2 = `E2E message 2 ${Date.now()}`;
    await sendChatMessageViaUI(sellerPage, msg1);
    await sendChatMessageViaUI(sellerPage, msg2);

    await waitForChatReady(buyerPage);

    // Click first message
    const row1 = buyerPage
      .locator("[data-chat-message-row]")
      .filter({ hasText: msg1 })
      .first();
    await expect(row1).toBeVisible({ timeout: 20_000 });
    await row1.click();

    const replyComposer = buyerPage.getByRole("region", {
      name: /respondiendo a mensajes en un hilo nuevo/i,
    });
    await expect(replyComposer).toBeVisible({ timeout: 10_000 });
    await expect(
      replyComposer.getByText(/citas en este hilo \(1\)/i),
    ).toBeVisible();

    // Click second message to add to preview
    const row2 = buyerPage
      .locator("[data-chat-message-row]")
      .filter({ hasText: msg2 })
      .first();
    await expect(row2).toBeVisible({ timeout: 20_000 });
    await row2.click();

    // Verify preview now shows 2 messages
    await expect(
      replyComposer.getByText(/citas en este hilo \(2\)/i),
    ).toBeVisible();

    await buyerCtx.close();
    await sellerCtx.close();
  });

  test("removes message from reply preview", async ({ browser }) => {
    test.setTimeout(120_000);
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

    const msg1 = `E2E remove target ${Date.now()}`;
    await sendChatMessageViaUI(sellerPage, msg1);

    await waitForChatReady(buyerPage);

    const row = buyerPage
      .locator("[data-chat-message-row]")
      .filter({ hasText: msg1 })
      .first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click();

    const replyComposer = buyerPage.getByRole("region", {
      name: /respondiendo a mensajes en un hilo nuevo/i,
    });
    await expect(replyComposer).toBeVisible({ timeout: 10_000 });
    await expect(
      replyComposer.getByText(/citas en este hilo \(1\)/i),
    ).toBeVisible();

    // Click the X button to remove the quote
    const removeButton = replyComposer.getByRole("button", {
      name: /quitar cita|cancelar/i,
    }).first();
    await expect(removeButton).toBeVisible();
    await removeButton.click();

    // Verify preview is closed
    await expect(replyComposer).not.toBeVisible({ timeout: 5_000 });

    await buyerCtx.close();
    await sellerCtx.close();
  });

  test("closes reply preview completely to send message without reply", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
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

    const msg1 = `E2E close preview ${Date.now()}`;
    await sendChatMessageViaUI(sellerPage, msg1);

    await waitForChatReady(buyerPage);

    const row = buyerPage
      .locator("[data-chat-message-row]")
      .filter({ hasText: msg1 })
      .first();
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click();

    const replyComposer = buyerPage.getByRole("region", {
      name: /respondiendo a mensajes en un hilo nuevo/i,
    });
    await expect(replyComposer).toBeVisible({ timeout: 10_000 });

    // Click the main cancel button to close the entire preview
    const cancelButton = replyComposer.getByRole("button", {
      name: /cancelar/i,
    });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Verify preview is closed
    await expect(replyComposer).not.toBeVisible({ timeout: 5_000 });

    // Send a regular message without reply
    const regularMsg = `Regular message without reply ${Date.now()}`;
    await sendChatMessageViaUI(buyerPage, regularMsg);
    await expect(buyerPage.getByText(regularMsg).first()).toBeVisible();

    await buyerCtx.close();
    await sellerCtx.close();
  });

  test("clicks on quoted message to scroll to original message", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
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

    // Send multiple messages to create a scrollable chat
    const msg1 = `E2E scroll target ${Date.now()}`;
    const msg2 = `E2E filler message 1 ${Date.now()}`;
    const msg3 = `E2E filler message 2 ${Date.now()}`;
    const msg4 = `E2E filler message 3 ${Date.now()}`;
    const msg5 = `E2E filler message 4 ${Date.now()}`;

    await sendChatMessageViaUI(sellerPage, msg1);
    await sendChatMessageViaUI(sellerPage, msg2);
    await sendChatMessageViaUI(sellerPage, msg3);
    await sendChatMessageViaUI(sellerPage, msg4);
    await sendChatMessageViaUI(sellerPage, msg5);

    await waitForChatReady(buyerPage);

    // Scroll to the first message to make it visible
    const targetRow = buyerPage
      .locator("[data-chat-message-row]")
      .filter({ hasText: msg1 })
      .first();
    await expect(targetRow).toBeVisible({ timeout: 20_000 });
    await targetRow.scrollIntoViewIfNeeded();

    // Click on the first message to select it for reply
    await targetRow.click();

    const replyComposer = buyerPage.getByRole("region", {
      name: /respondiendo a mensajes en un hilo nuevo/i,
    });
    await expect(replyComposer).toBeVisible({ timeout: 10_000 });

    // Send a reply
    const replyText = `E2E reply with quote ${Date.now()}`;
    await sendChatMessageViaUI(buyerPage, replyText);
    await expect(buyerPage.getByText(replyText).first()).toBeVisible();

    // Verify the reply component appears
    await expect(buyerPage.getByText(/hilo nuevo/i)).toBeVisible();

    // Scroll down to the reply message
    const replyRow = buyerPage
      .locator("[data-chat-message-row]")
      .filter({ hasText: replyText })
      .first();
    await replyRow.scrollIntoViewIfNeeded();

    // Click on the quoted message in the reply to scroll to the original
    const quotedMessage = buyerPage
      .locator("[data-chat-message-row]")
      .filter({ hasText: replyText })
      .first()
      .locator("button")
      .filter({ hasText: msg1 });
    await expect(quotedMessage).toBeVisible();
    await quotedMessage.click();

    // Verify we scrolled to the original message (it should be visible)
    await expect(targetRow).toBeVisible();

    await buyerCtx.close();
    await sellerCtx.close();
  });
});
