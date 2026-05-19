import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  e2eOfferId,
} from "../../Resources/chat-env";
import { openOfferAndComprar } from "../../Resources/chat-helpers";

test.describe("chat comprar flow", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);

  test("Comprar opens a persisted chat thread", async ({ page }) => {
    const threadId = await openOfferAndComprar(page, e2eOfferId);
    expect(threadId).toMatch(/^cth_/);
    await expect(page.getByText(/interés|coordinar|charlar/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("each Comprar creates a new thread id", async ({ page }) => {
    test.setTimeout(90_000);
    const first = await openOfferAndComprar(page, e2eOfferId);
    await page.goto(`/offer/${e2eOfferId}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    const second = await openOfferAndComprar(page, e2eOfferId);
    expect(first).toMatch(/^cth_/);
    expect(second).toMatch(/^cth_/);
    expect(second).not.toBe(first);
  });

  test("chat list search filters by store or offer", async ({ page }) => {
    test.setTimeout(60_000);
    await openOfferAndComprar(page, e2eOfferId);
    await page.goto("/chat", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    const filter = page.locator("#chat-list-name-filter");
    await expect(filter).toBeVisible({ timeout: 25_000 });
    await expect(page.locator("a[href^='/chat/cth_']").first()).toBeVisible({
      timeout: 15_000,
    });
    await filter.fill("Tienda E2E");
    await expect(page.locator("a[href^='/chat/cth_']").first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
