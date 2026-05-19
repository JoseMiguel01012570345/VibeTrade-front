import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  getE2EScenario,
} from "../../Resources/chat-env";
import { profile } from "../../Resources/selectors";

/** Paridad E2E con profileAccount.render / navigation / logic (visitor). */
test.describe("profileAccount visitor E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);

  test("renders visitor account as read-only", async ({ page }) => {
    const scenario = getE2EScenario()!;
    await page.goto(`/profile/${scenario.sellerUserId}/account`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(
      new RegExp(`/profile/${scenario.sellerUserId}/account`),
      { timeout: 20_000 },
    );
    await expect(
      page.locator("input[disabled], input[readonly]").first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("button", { name: profile.contactsButton }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: profile.logoutButton }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: profile.connectInstagram }),
    ).toBeDisabled();
  });

  test("redirects visitor away from reels tab", async ({ page }) => {
    const scenario = getE2EScenario()!;
    await page.goto(`/profile/${scenario.sellerUserId}/reels`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/(profile\/.*\/account|\/home)/, {
      timeout: 15_000,
    });
  });
});
