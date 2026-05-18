import { test, expect } from "../../Resources/auth-fixture";
import { resolveOfferId } from "../../Resources/e2e-discovery";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

test.describe("saved offers E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("offer page exposes save control when authenticated", async ({
    page,
  }) => {
    const offerId = await resolveOfferId(page);
    test.skip(!offerId, "No offer found on home feed; seed data or set PLAYWRIGHT_E2E_OFFER_ID");
    await page.goto(`/offer/${offerId}`);
    await expect(
      page.getByRole("button", {
        name: /guardar oferta|quitar de guardados/i,
      }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
