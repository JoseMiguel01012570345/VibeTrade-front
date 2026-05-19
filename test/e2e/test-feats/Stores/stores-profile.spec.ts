import { sellerTest, expect } from "../../Resources/seller-auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  chatE2ESellerSkipReason,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import { profile } from "../../Resources/selectors";

sellerTest.describe("profile stores E2E", () => {
  sellerTest.skip(!chatE2EReady(), chatE2ESkipReason);
  sellerTest.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  sellerTest("owner sees stores section and new store action", async ({ page }) => {
    await page.goto("/profile/me/stores");
    await expect(
      page.getByRole("button", { name: profile.newStoreButton }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
