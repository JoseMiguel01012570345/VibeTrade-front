import { test, expect } from "@playwright/test";
import { getE2EOfferId } from "../../Resources/env";
import { market } from "../../Resources/selectors";

/** Paridad E2E con offerSaveButton (guest). */
test.describe("OfferSaveButton guest E2E", () => {
  test("shows login toast when guest clicks save", async ({ page }) => {
    const offerId = getE2EOfferId();
    test.skip(!offerId, "No offer id; run global-setup or set PLAYWRIGHT_E2E_OFFER_ID");
    await page.goto(`/offer/${offerId}`);
    await page
      .getByRole("button", { name: market.saveOfferButton })
      .click({ timeout: 15_000 });
    await expect(page.getByText(market.loginToSaveToast)).toBeVisible({
      timeout: 10_000,
    });
  });
});
