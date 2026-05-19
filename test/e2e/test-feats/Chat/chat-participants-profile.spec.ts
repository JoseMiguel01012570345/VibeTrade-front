import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  e2eOfferId,
} from "../../Resources/chat-env";
import { openOfferAndComprar, waitForChatThread } from "../../Resources/chat-helpers";

test.describe("chat participants and profile navigation", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);

  test("people panel link navigates to profile or vitrina", async ({ page }) => {
    await openOfferAndComprar(page, e2eOfferId);
    await waitForChatThread(page);

    const peopleTab = page.getByRole("button", { name: /integrantes/i });
    if (await peopleTab.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await peopleTab.click();
    }

    const profileLink = page
      .locator("a[href^='/profile/'], a[href*='/store/'][href*='vitrina']")
      .first();
    await expect(profileLink).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/\d{1,3}(\s*\/\s*100)?/).first()).toBeVisible({
      timeout: 10_000,
    });
    const href = await profileLink.getAttribute("href");
    expect(href).toBeTruthy();
    await profileLink.click();
    await expect(page).toHaveURL(/\/(profile|store)\//, { timeout: 15_000 });
  });
});
