import { sellerTest, expect } from "../../Resources/seller-auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  chatE2ESellerSkipReason,
  getE2EScenario,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import { market } from "../../Resources/selectors";

/** Paridad E2E con offerSaveButton (own offer). */
sellerTest.describe("OfferSaveButton own offer E2E", () => {
  sellerTest.skip(!chatE2EReady(), chatE2ESkipReason);
  sellerTest.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  sellerTest("does not render save control for own offer", async ({ page }) => {
    const scenario = getE2EScenario()!;
    await page.goto(`/offer/${scenario.offerId}`);
    await expect(
      page.getByRole("button", { name: market.saveOfferButton }),
    ).toHaveCount(0, { timeout: 15_000 });
  });
});
