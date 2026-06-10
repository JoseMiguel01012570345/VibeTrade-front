import { test, expect } from "../../Resources/auth-fixture";
import { openAccountPage } from "../../Resources/e2e-profile-helpers";
import { profile } from "../../Resources/selectors";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

/** Paridad E2E con test/test-feats/Profile/profileAccount.socialLinks.test.tsx */
test.describe("profileAccount social links E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("opens instagram modal and saves handle", async ({ page }) => {
    await openAccountPage(page);
    await page.getByRole("button", { name: profile.connectInstagram }).click();
    await expect(page.getByText(/conectar instagram/i).first()).toBeVisible();
    const handle = `e2e_${Date.now().toString(36).slice(-6)}`;
    await page.getByPlaceholder(/@|usuario|instagram/i).fill(handle);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^guardar$/i })
      .click();
    await expect(page.getByText(/guardado|actualizado/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("opens X modal", async ({ page }) => {
    await openAccountPage(page);
    await page.getByRole("button", { name: profile.connectX }).click();
    await expect(page.getByText(/conectar x/i).first()).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("saves telegram handle", async ({ page }) => {
    await openAccountPage(page);
    await page.getByRole("button", { name: profile.connectTelegram }).click();
    await expect(page.getByText(/conectar telegram/i).first()).toBeVisible();
    const handle = `@e2e_${Date.now().toString(36).slice(-6)}`;
    await page.getByPlaceholder(/@|usuario|telegram/i).fill(handle);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^guardar$/i })
      .click();
    await expect(page.getByText(/guardado|actualizado/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
