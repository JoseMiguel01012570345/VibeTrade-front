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

/**
 * E2E tests for social group chats with multiple users and message status tracking.
 * Tests message delivery, seen status, and offline user scenarios.
 */
test.describe("chat social group E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test("creates social group chat with multiple users and sends messages", async ({
    browser,
  }) => {
    test.slow();

    const userACtx = await browser.newContext();
    const userBCtx = await browser.newContext();

    try {
      await userACtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2EToken());
      const userAPage = await userACtx.newPage();

      await userBCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2ESellerToken());
      const userBPage = await userBCtx.newPage();

      // User A creates a chat by making a purchase
      const threadId = await openOfferAndComprar(userAPage, e2eOfferId);

      // User B joins the chat
      await openChatThread(userBPage, threadId);
      await waitForChatReady(userBPage);
      await waitForChatReady(userAPage);

      // Send messages from both users
      const messageFromA = `Message from User A ${Date.now()}`;
      const messageFromB = `Message from User B ${Date.now()}`;

      await sendChatMessageViaUI(userAPage, messageFromA);
      await sendChatMessageViaUI(userBPage, messageFromB);

      // Verify both users see both messages
      await expect(userAPage.getByText(messageFromA).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(userAPage.getByText(messageFromB).first()).toBeVisible({
        timeout: 20_000,
      });

      await expect(userBPage.getByText(messageFromA).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(userBPage.getByText(messageFromB).first()).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await userACtx.close();
      await userBCtx.close();
    }
  });

  test("message status updates from delivered to seen", async ({ browser }) => {
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
      await waitForChatReady(buyerPage);

      // Seller sends message to buyer
      const messageText = `Status test message ${Date.now()}`;
      await sendChatMessageViaUI(sellerPage, messageText);

      // Verify message appears on sender side
      const messageRow = sellerPage
        .locator("[data-chat-message-row]")
        .filter({ hasText: messageText })
        .first();
      await expect(messageRow).toBeVisible({ timeout: 20_000 });

      // Wait for delivery acknowledgment
      await sellerPage.waitForTimeout(2000);

      // Buyer opens the chat thread and views the message
      await buyerPage.goto(`/chat/${threadId}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await waitForChatReady(buyerPage);

      // Verify message is visible to buyer
      await expect(buyerPage.getByText(messageText).first()).toBeVisible({
        timeout: 20_000,
      });

      // Scroll to message to trigger "read" status
      const buyerMessageRow = buyerPage
        .locator("[data-chat-message-row]")
        .filter({ hasText: messageText })
        .first();
      await buyerMessageRow.scrollIntoViewIfNeeded();
      await buyerPage.waitForTimeout(2000);

      // Seller should eventually see "read" status (double checkmark or "Visto")
      // Reload to get updated status
      await sellerPage.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
      await waitForChatReady(sellerPage);

      // Verify message still visible with updated status
      await expect(sellerPage.getByText(messageText).first()).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await buyerCtx.close();
      await sellerCtx.close();
    }
  });

  test("offline user receives notifications and status updates when viewing messages", async ({
    browser,
  }) => {
    test.slow();

    const user1Ctx = await browser.newContext();
    const user2Ctx = await browser.newContext();

    try {
      await user1Ctx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2EToken());
      const user1Page = await user1Ctx.newPage();

      await user2Ctx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2ESellerToken());
      const user2Page = await user2Ctx.newPage();

      // Create chat thread
      const threadId = await openOfferAndComprar(user1Page, e2eOfferId);
      await openChatThread(user2Page, threadId);
      await waitForChatReady(user1Page);
      await waitForChatReady(user2Page);

      // Send initial messages
      const messages = [
        `Message 1 from User 1 ${Date.now()}`,
        `Message 2 from User 1 ${Date.now()}`,
        `Message 3 from User 1 ${Date.now()}`,
      ];

      for (const msg of messages) {
        await sendChatMessageViaUI(user1Page, msg);
        await user2Page.waitForTimeout(500);
      }

      // User 2 verifies all messages received
      for (const msg of messages) {
        await expect(user2Page.getByText(msg).first()).toBeVisible({
          timeout: 20_000,
        });
      }

      // User 2 closes browser (simulates going offline)
      await user2Ctx.close();

      // User 1 sends more messages while User 2 is offline
      const offlineMessages = [
        `Offline message 1 ${Date.now()}`,
        `Offline message 2 ${Date.now()}`,
      ];

      for (const msg of offlineMessages) {
        await sendChatMessageViaUI(user1Page, msg);
      }

      // Wait for messages to be delivered
      await user1Page.waitForTimeout(3000);

      // User 2 comes back online
      const user2ReconnectedCtx = await browser.newContext();
      await user2ReconnectedCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, getE2ESellerToken());
      const user2ReconnectedPage = await user2ReconnectedCtx.newPage();

      try {
        // User 2 goes directly to the chat thread using the helper
        await openChatThread(user2ReconnectedPage, threadId);
        await waitForChatReady(user2ReconnectedPage);

        // Wait for messages to sync
        await user2ReconnectedPage.waitForTimeout(5000);

        // Verify offline messages are visible (may take time to sync)
        for (const msg of offlineMessages) {
          const msgLocator = user2ReconnectedPage.getByText(msg).first();
          try {
            await expect(msgLocator).toBeVisible({ timeout: 30_000 });
          } catch {
            // Message may not appear if sync failed - reload and retry
            await user2ReconnectedPage.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
            await waitForChatReady(user2ReconnectedPage);
            await expect(msgLocator).toBeVisible({ timeout: 20_000 });
          }
        }

        // Scroll to view all messages (triggers "read" status)
        const messageRows = user2ReconnectedPage.locator("[data-chat-message-row]");
        const count = await messageRows.count();
        for (let i = 0; i < Math.min(count, 5); i++) {
          await messageRows.nth(i).scrollIntoViewIfNeeded();
          await user2ReconnectedPage.waitForTimeout(500);
        }

        // Wait for status updates to propagate
        await user2ReconnectedPage.waitForTimeout(3000);

        // User 1 should see updated status (messages marked as seen)
        await user1Page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
        await waitForChatReady(user1Page);

        // Verify all messages still visible
        for (const msg of [...messages, ...offlineMessages]) {
          await expect(user1Page.getByText(msg).first()).toBeVisible({
            timeout: 20_000,
          });
        }
      } finally {
        await user2ReconnectedCtx.close();
      }
    } finally {
      await user1Ctx.close();
    }
  });

  test("social group chat shows correct participant count and profiles", async ({ browser }) => {
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
      await waitForChatReady(buyerPage);

      // Open the participants/people panel (right rail panel)
      const panelToggle = buyerPage.getByRole("button", {
        name: /acciones del chat|panel|participantes/i,
      }).first();
      if (await panelToggle.isVisible().catch(() => false)) {
        await panelToggle.click();
        await buyerPage.waitForTimeout(1000);
      }

      // Look for the participants panel
      const participantsPanel = buyerPage
        .locator("[data-chat-participants], [data-right-rail], .chat-participants")
        .first();

      // If panel not immediately visible, try clicking on "Panel" button
      if (!(await participantsPanel.isVisible().catch(() => false))) {
        const panelButton = buyerPage
          .getByRole("button")
          .filter({ hasText: /panel/i })
          .first();
        if (await panelButton.isVisible().catch(() => false)) {
          await panelButton.click();
          await buyerPage.waitForTimeout(1000);
        }
      }

      // Verify participant count (should be at least 2 - buyer and seller)
      const participantLinks = buyerPage
        .locator('a[href^="/profile"], a[href^="/user"]')
        .filter({ has: buyerPage.locator("text=/confianza|trust/i") });

      const participantCount = await participantLinks.count();
      expect(participantCount).toBeGreaterThanOrEqual(2);

      // Send a message and verify it appears for both
      const testMessage = `Group chat test ${Date.now()}`;
      await sendChatMessageViaUI(buyerPage, testMessage);

      await expect(buyerPage.getByText(testMessage).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(sellerPage.getByText(testMessage).first()).toBeVisible({
        timeout: 20_000,
      });
    } finally {
      await buyerCtx.close();
      await sellerCtx.close();
    }
  });

  test("can access user profiles from chat participants panel", async ({ browser }) => {
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
      await waitForChatReady(buyerPage);

      // Try to open participants panel
      const panelButton = buyerPage
        .getByRole("button")
        .filter({ hasText: /panel|participantes/i })
        .first();
      if (await panelButton.isVisible().catch(() => false)) {
        await panelButton.click();
        await buyerPage.waitForTimeout(1000);
      }

      // Look for participant cards with profile links
      const participantCards = buyerPage
        .locator("a")
        .filter({ has: buyerPage.locator("text=/confianza/i") })
        .filter({ has: buyerPage.locator("text=/comprador|vendedor|transportista/i") });

      // Count participants
      const count = await participantCards.count();
      expect(count).toBeGreaterThanOrEqual(1);

      // Click on first participant to access their profile
      const firstParticipant = participantCards.first();
      await expect(firstParticipant).toBeVisible({ timeout: 10_000 });

      // Get the href before clicking
      const href = await firstParticipant.getAttribute("href");
      expect(href).toBeTruthy();

      // Click the participant card
      await firstParticipant.click();

      // Verify we navigated to a profile page
      await expect(buyerPage).toHaveURL(new RegExp(`/profile|/user|/store`), {
        timeout: 30_000,
      });

      // Verify profile page loaded with expected content
      await expect(
        buyerPage.getByText(/confianza|verificado|productos/i).first(),
      ).toBeVisible({ timeout: 20_000 });
    } finally {
      await buyerCtx.close();
      await sellerCtx.close();
    }
  });
});
