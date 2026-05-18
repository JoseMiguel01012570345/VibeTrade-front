import { test, expect } from "../../Resources/auth-fixture";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

test.describe("saved offers E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("offer page exposes save control when authenticated", async ({
    page,
  }) => {
    const offerId = process.env.PLAYWRIGHT_E2E_OFFER_ID?.trim();
    test.skip(!offerId, "Set PLAYWRIGHT_E2E_OFFER_ID for offer save E2E");
    await page.goto(`/offer/${offerId}`);
    await expect(
      page.getByRole("button", {
        name: /guardar oferta|quitar de guardados/i,
      }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
