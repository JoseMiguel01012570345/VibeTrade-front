import { test, expect } from "../../Resources/auth-fixture";
import { e2eSkipReason, getE2EStoreId, isE2EReady } from "../../Resources/env";

test.describe("finance / warehouse / affiliate admin E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("debts admin page renders the finance panel", async ({ page }) => {
    await page.goto("/finanzas/deudas", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /finanzas\s*·\s*deudas/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("affiliate dashboard renders", async ({ page }) => {
    await page.goto("/afiliado", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /panel de afiliado/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("warehouse portal renders for a store", async ({ page }) => {
    const storeId = getE2EStoreId() || "st_demo";
    await page.goto(`/almacen/${encodeURIComponent(storeId)}/pedidos`, {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: /almac[eé]n\s*·\s*pedidos/i }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
