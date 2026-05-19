import { test, expect } from "../../Resources/auth-fixture";
import { resolveOfferId } from "../../Resources/e2e-discovery";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

test.describe("profile saved offers E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("save offer, list in Guardados and open offer", async ({ page }) => {
    const offerId = await resolveOfferId(page);
    test.skip(!offerId, "No offer found on home feed; seed data or set PLAYWRIGHT_E2E_OFFER_ID");

    await page.goto(`/offer/${offerId}`, { waitUntil: "domcontentloaded" });
    const saveBtn = page.getByRole("button", {
      name: /guardar oferta|quitar de guardados/i,
    });
    await expect(saveBtn).toBeVisible({ timeout: 15_000 });
    const saveLabel = (await saveBtn.getAttribute("aria-label")) ?? "";
    if (/guardar oferta/i.test(saveLabel)) {
      await saveBtn.click();
      await expect(page.getByText(/guardada en tu perfil/i)).toBeVisible({
        timeout: 10_000,
      });
    }

    await page.goto("/profile/me/saved", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/ofertas guardadas/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/aún no guardaste ofertas/i)).toBeHidden({
      timeout: 30_000,
    });
    const card = page.locator(`a[href="/offer/${offerId}"]`).first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/offer/${offerId}`));
  });
});
