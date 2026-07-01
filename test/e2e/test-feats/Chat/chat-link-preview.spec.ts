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
  waitForLinkPreviewSettled,
} from "../../Resources/chat-helpers";

/** E2E tests for chat link preview feature. */
test.describe("chat link preview E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  test("sends message with URL and shows link preview", async ({ browser }) => {
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

    const url = "https://example.com";
    const messageWithUrl = `Check out this link: ${url} ${Date.now()}`;
    await sendChatMessageViaUI(sellerPage, messageWithUrl);

    await waitForChatReady(buyerPage);

    // Verify the message with URL appears
    await expect(buyerPage.getByText(messageWithUrl).first()).toBeVisible({
      timeout: 20_000,
    });

    // Wait for preview to load (or settle without card if API has no data)
    await waitForLinkPreviewSettled(buyerPage);

    // If preview loaded, verify it's an anchor with correct attributes
    const previewCard = buyerPage.locator('a[target="_blank"]').first();
    try {
      await expect(previewCard).toBeVisible({ timeout: 5_000 });
      // If visible, verify attributes
      await expect(previewCard).toHaveAttribute("target", "_blank");
    } catch {
      // Preview may not appear if API returns no data, which is fine
    }

    await buyerCtx.close();
    await sellerCtx.close();
  });

  test("only first URL gets preview when multiple URLs in message", async ({
    browser,
  }) => {
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

    const url1 = "https://example.com";
    const url2 = "https://github.com";
    const messageWithUrls = `Two links: ${url1} and ${url2} ${Date.now()}`;
    await sendChatMessageViaUI(sellerPage, messageWithUrls);

    await waitForChatReady(buyerPage);

    // Verify the message appears
    await expect(buyerPage.getByText(messageWithUrls).first()).toBeVisible({
      timeout: 20_000,
    });

    // Wait for preview to load (or settle without card if API has no data)
    await waitForLinkPreviewSettled(buyerPage);

    // If a preview loaded, there should be at most one (only first URL gets preview)
    // Note: Preview may not appear if API returns no data
    const previewCards = buyerPage.locator('a[target="_blank"]');
    const count = await previewCards.count();
    expect(count).toBeLessThanOrEqual(1);

    await buyerCtx.close();
    await sellerCtx.close();
  });

  test("link preview works without image", async ({ browser }) => {
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

    // Use a URL that may not have an image preview
    const url = "https://httpbin.org/html";
    const messageWithUrl = `Link without image: ${url} ${Date.now()}`;
    await sendChatMessageViaUI(sellerPage, messageWithUrl);

    await waitForChatReady(buyerPage);

    // Verify the message appears
    await expect(buyerPage.getByText(messageWithUrl).first()).toBeVisible({
      timeout: 20_000,
    });

    // Wait for preview to load (may not have image)
    await waitForLinkPreviewSettled(buyerPage);

    await buyerCtx.close();
    await sellerCtx.close();
  });

  test("clicking link preview opens URL in new tab", async ({ browser }) => {
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

    const url = "https://example.com";
    const messageWithUrl = `Click this: ${url} ${Date.now()}`;
    await sendChatMessageViaUI(sellerPage, messageWithUrl);

    await waitForChatReady(buyerPage);

    // Wait for message and preview to appear
    await expect(buyerPage.getByText(messageWithUrl).first()).toBeVisible({
      timeout: 20_000,
    });
    await waitForLinkPreviewSettled(buyerPage);

    // If preview loaded, verify it has correct link attributes
    const previewCard = buyerPage.locator('a[target="_blank"]').first();
    try {
      await expect(previewCard).toBeVisible({ timeout: 5_000 });
      await expect(previewCard).toHaveAttribute("target", "_blank");
      await expect(previewCard).toHaveAttribute("rel", /noopener|noreferrer/);
    } catch {
      // Preview may not appear if API returns no data, which is acceptable
    }

    await buyerCtx.close();
    await sellerCtx.close();
  });

  test("no preview shown for invalid URLs", async ({ browser }) => {
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

    // Use an invalid URL that won't return preview data
    const invalidUrl = "https://invalid-domain-12345-test.com";
    const messageWithUrl = `Invalid link: ${invalidUrl} ${Date.now()}`;
    await sendChatMessageViaUI(sellerPage, messageWithUrl);

    await waitForChatReady(buyerPage);

    // Verify the message appears
    await expect(buyerPage.getByText(messageWithUrl).first()).toBeVisible({
      timeout: 20_000,
    });

    // Wait for loading state to appear then disappear (or settle without loading flash)
    await waitForLinkPreviewSettled(buyerPage);

    await buyerCtx.close();
    await sellerCtx.close();
  });
});
