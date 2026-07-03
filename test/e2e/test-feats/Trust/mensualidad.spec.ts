import { test, expect } from "../../Resources/auth-fixture";
import { e2eSkipReason, isE2EReady } from "../../Resources/env";
import {
  adjustTrustViaApi,
  getTrustStatusViaApi,
} from "../../Resources/e2e-orders-api";

test.describe("mensualidad / trust gate E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("mensualidad page shows trust score and threshold", async ({ page }) => {
    await page.goto("/mensualidad", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /mensualidad/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/tu puntaje/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/umbral/i).first()).toBeVisible();
  });

  test("below threshold blocks interactions and paying restores access", async ({
    page,
  }) => {
    await page.goto("/mensualidad", { waitUntil: "domcontentloaded" });
    const before = await getTrustStatusViaApi(page);

    // Empuja el puntaje por debajo del umbral para forzar el estado bloqueado.
    const downDelta = before.threshold - before.trustScore - 5;
    await adjustTrustViaApi(page, downDelta, "E2E: bajar del umbral");

    await page.goto("/mensualidad", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(/interacciones están bloqueadas/i),
    ).toBeVisible({ timeout: 15_000 });
    const payButton = page.getByRole("button", { name: /pagar mensualidad/i });
    await expect(payButton).toBeVisible();
    await payButton.click();

    await expect(page.getByText(/tu cuenta está activa/i)).toBeVisible({
      timeout: 15_000,
    });

    // Restaura el puntaje original para no ensuciar la sesión compartida del setup.
    const afterPay = await getTrustStatusViaApi(page);
    const restoreDelta = before.trustScore - afterPay.trustScore;
    if (restoreDelta !== 0) {
      await adjustTrustViaApi(page, restoreDelta, "E2E: restaurar confianza");
    }
  });
});
