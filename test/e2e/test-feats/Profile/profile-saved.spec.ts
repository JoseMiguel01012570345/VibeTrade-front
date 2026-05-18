import { test, expect } from "../../Resources/auth-fixture";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

/**
 * E2E guardados. Requiere PLAYWRIGHT_E2E=1, PLAYWRIGHT_E2E_TOKEN,
 * PLAYWRIGHT_E2E_OFFER_ID (oferta ajena para guardar).
 */
test.describe("profile saved offers E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("save offer, list in Guardados and open offer", async ({ page }) => {
    const offerId = process.env.PLAYWRIGHT_E2E_OFFER_ID?.trim();
    test.skip(!offerId, "Set PLAYWRIGHT_E2E_OFFER_ID for saved offers E2E");

    await page.goto(`/offer/${offerId}`);
    const saveBtn = page.getByRole("button", {
      name: /guardar oferta|quitar de guardados/i,
    });
    await expect(saveBtn).toBeVisible({ timeout: 15_000 });
    const label = await saveBtn.textContent();
    if (/guardar oferta/i.test(label ?? "")) {
      await saveBtn.click();
      await expect(page.getByText(/guardada en tu perfil/i)).toBeVisible({
        timeout: 10_000,
      });
    }

    await page.goto("/profile/me/saved");
    await expect(page.getByText(/ofertas guardadas/i)).toBeVisible({
      timeout: 15_000,
    });
    const card = page.locator(`a[href="/offer/${offerId}"]`).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/offer/${offerId}`));
  });
});
