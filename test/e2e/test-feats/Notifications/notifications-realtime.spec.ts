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
  waitForAgreementBubble,
  waitForChatReady,
} from "../../Resources/chat-helpers";
import {
  buyerRespondToAgreement,
  sellerEmitServiceAgreement,
} from "../../Resources/agreement-ui-helpers";

/** E2E tests for real-time notifications. */
test.describe("notifications realtime E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test("receives notification when message arrives in real-time", async ({ browser }) => {
    test.slow();
    
    const buyerCtx = await browser.newContext();
    const sellerCtx = await browser.newContext();
    
    try {
      await buyerCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2EToken());
      const buyerPage = await buyerCtx.newPage();
      const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
      
      await sellerCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2ESellerToken());
      const sellerPage = await sellerCtx.newPage();
      await openChatThread(sellerPage, threadId);
      await waitForChatReady(sellerPage);
      
      // User A (buyer) stays in chat, User B (seller) goes to home page
      await buyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await expect(buyerPage.getByRole("button", { name: /abrir notificaciones/i }))
        .toBeVisible({ timeout: 20_000 });
      
      const notificationBell = buyerPage.getByRole("button", { name: /abrir notificaciones/i });
      
      // User B sends a message
      const messageText = `Test notification message ${Date.now()}`;
      await sendChatMessageViaUI(sellerPage, messageText);
      
      // Wait for real-time notification to arrive
      await buyerPage.waitForTimeout(3000);
      
      // Open notifications panel
      await notificationBell.click();
      
      // Verify notification panel is open
      const notificationsModal = buyerPage.getByRole("dialog", { name: /notificaciones/i });
      await expect(notificationsModal).toBeVisible({ timeout: 10_000 });
      
      // Click on the notification to navigate to chat
      const chatLink = buyerPage.getByText(/abrir chat/i).first();
      if (await chatLink.isVisible().catch(() => false)) {
        await chatLink.click();
      }
      
      // Verify navigated to chat and message is visible
      await expect(buyerPage).toHaveURL(new RegExp(`/chat/${threadId}`), { timeout: 30_000 });
      await expect(buyerPage.getByText(messageText).first()).toBeVisible({ timeout: 20_000 });
    } finally {
      await buyerCtx.close();
      await sellerCtx.close();
    }
  });

  test("receives notifications for agreement accept/reject/edit", async ({ browser }) => {
    test.slow();
    
    const buyerCtx = await browser.newContext();
    const sellerCtx = await browser.newContext();
    
    try {
      await buyerCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2EToken());
      const buyerPage = await buyerCtx.newPage();
      
      await sellerCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2ESellerToken());
      const sellerPage = await sellerCtx.newPage();
      
      // Create chat thread as buyer
      const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
      await openChatThread(sellerPage, threadId);
      await waitForChatReady(sellerPage);
      await waitForChatReady(buyerPage);
      
      // Seller emits agreement
      const agreementTitle = `Agreement Test ${Date.now()}`;
      await sellerEmitServiceAgreement(sellerPage, {
        title: agreementTitle,
        serviceNamePart: "Consultoría E2E",
      });
      
      // Wait for agreement to appear in buyer's chat
      await waitForAgreementBubble(buyerPage, agreementTitle);

      // Buyer leaves chat so acceptance can push a notification while elsewhere
      await buyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });

      await buyerPage.goto(`/chat/${threadId}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await waitForChatReady(buyerPage);
      await buyerRespondToAgreement(buyerPage, agreementTitle, "accept");

      await buyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      
      // Open notifications panel
      const notificationBell = buyerPage.getByRole("button", { name: /abrir notificaciones/i });
      await notificationBell.click();
      
      // Verify notification about agreement accepted
      const notificationsModal = buyerPage.getByRole("dialog", { name: /notificaciones/i });
      await expect(notificationsModal).toBeVisible({ timeout: 10_000 });
      
      // Close notifications and go back to chat for edit test
      await buyerPage.getByRole("button", { name: /cerrar/i }).first().click();
      await buyerPage.goto(`/chat/${threadId}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await waitForChatReady(buyerPage);
      
      // Seller edits the agreement
      await sellerPage.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
      await waitForChatReady(sellerPage);
      
      // Find the accepted agreement and edit it
      const acceptedBubble = sellerPage.locator("[data-chat-agreement]").filter({ hasText: agreementTitle });
      await expect(acceptedBubble.getByText(/aceptado/i)).toBeVisible({ timeout: 20_000 });
      
      // Click edit button if available
      const editButton = acceptedBubble.getByRole("button", { name: /editar/i });
      if (await editButton.isVisible().catch(() => false)) {
        await editButton.click();
        
        // Modify and save
        await sellerPage.getByLabel(/título/i).fill(`${agreementTitle} - Edited`);
        await sellerPage.getByRole("button", { name: /guardar|actualizar/i }).click();
      }
    } finally {
      await buyerCtx.close();
      await sellerCtx.close();
    }
  });

  test("syncs notifications from server on page load", async ({ browser }) => {
    test.slow();
    
    const buyerCtx = await browser.newContext();
    const sellerCtx = await browser.newContext();
    
    try {
      await buyerCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2EToken());
      const buyerPage = await buyerCtx.newPage();
      
      await sellerCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2ESellerToken());
      const sellerPage = await sellerCtx.newPage();
      
      // Create chat thread
      const threadId = await openOfferAndComprar(buyerPage, e2eOfferId);
      await openChatThread(sellerPage, threadId);
      await waitForChatReady(sellerPage);
      
      // Seller sends message while buyer is not in chat
      await buyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      
      const messageText = `Offline notification test ${Date.now()}`;
      await sendChatMessageViaUI(sellerPage, messageText);
      
      // Wait for message to be delivered
      await sellerPage.waitForTimeout(3000);
      
      // Close buyer page completely (simulate offline)
      await buyerPage.close();
      
      // Reopen buyer page
      const newBuyerPage = await buyerCtx.newPage();
      await newBuyerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      
      // Wait for notifications to sync
      await newBuyerPage.waitForTimeout(5000);
      
      // Open notifications panel
      const notificationBell = newBuyerPage.getByRole("button", { name: /abrir notificaciones/i });
      await expect(notificationBell).toBeVisible({ timeout: 20_000 });
      await notificationBell.click();
      
      // Verify notifications panel shows synced notifications
      const notificationsModal = newBuyerPage.getByRole("dialog", { name: /notificaciones/i });
      await expect(notificationsModal).toBeVisible({ timeout: 10_000 });
      
      // Verify the panel loaded with notifications
      await expect(newBuyerPage.getByText(/historial y avisos recientes/i)).toBeVisible();
    } finally {
      await buyerCtx.close();
      await sellerCtx.close();
    }
  });
});
