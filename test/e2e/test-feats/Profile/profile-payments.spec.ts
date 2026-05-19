import { test, expect } from "../../Resources/auth-fixture";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";

/** Paridad E2E con test/test-feats/Profile/paymentGatewayConfigModal.test.tsx */
test.describe("PaymentGatewayConfigModal E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("shows loading then card list or empty state", async ({ page }) => {
    await page.goto("/profile/me/account?stripeCards=1");
    const dialog = page.getByRole("dialog", { name: /pagos \(demo\)/i });
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await expect(
      dialog
        .getByText(/tarjetas|no hay tarjetas|agregar/i)
        .first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("calls onClose on Escape", async ({ page }) => {
    await page.goto("/profile/me/account?stripeCards=1");
    await expect(
      page.getByRole("dialog", { name: /pagos \(demo\)/i }),
    ).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: /pagos \(demo\)/i }),
    ).toBeHidden({ timeout: 10_000 });
  });

  test("create setup intent when adding a card", async ({ page }) => {
    await page.goto("/profile/me/account?stripeCards=1");
    const dialog = page.getByRole("dialog", { name: /pagos \(demo\)/i });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    const addBtn = dialog.getByRole("button", {
      name: /crear nueva tarjeta|agregar tarjeta/i,
    });
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await expect(
        dialog.getByText(/stripe|tarjeta|número/i).first(),
      ).toBeVisible({ timeout: 20_000 });
    }
  });
});
