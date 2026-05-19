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
    await page.goto(`/offer/${offerId}`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", {
        name: /guardar oferta|quitar de guardados/i,
      }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("removes saved offer on second click", async ({ page }) => {
    const offerId = await resolveOfferId(page);
    test.skip(!offerId, "No offer found on home feed");
    await page.goto(`/offer/${offerId}`);
    const saveBtn = page.getByRole("button", {
      name: /guardar oferta|quitar de guardados/i,
    });
    await expect(saveBtn).toBeVisible({ timeout: 15_000 });
    const label = (await saveBtn.getAttribute("aria-label")) ?? "";
    if (/guardar oferta/i.test(label)) {
      await saveBtn.click();
      await expect(page.getByText(/guardada en tu perfil/i)).toBeVisible({
        timeout: 10_000,
      });
    }
    const unsave = page.getByRole("button", { name: /quitar de guardados/i });
    await expect(unsave).toBeVisible({ timeout: 10_000 });
    await unsave.click();
    await expect(page.getByText(/quitada de guardados/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
