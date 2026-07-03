import { test, expect } from "../../Resources/auth-fixture";
import { e2eSkipReason, isE2EReady, getE2EScenario } from "../../Resources/env";
import { createPickupOrderViaApi } from "../../Resources/e2e-orders-api";

test.describe("pedido checkout + rastreo E2E", () => {
  test.skip(!isE2EReady(), e2eSkipReason);

  test("purchase history page renders", async ({ page }) => {
    await page.goto("/mis-compras", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /mis compras/i })).toBeVisible({
      timeout: 20_000,
    });
  });

  test("checkout via API creates a VT- pedido shown in rastreo and history", async ({
    page,
  }) => {
    const scenario = getE2EScenario();
    const productId2 = scenario?.productId2 ?? "";
    test.skip(
      productId2.length === 0,
      "requires global-setup scenario with a published product",
    );

    // Abre la app para inicializar la sesión antes de llamar a la API desde el navegador.
    await page.goto("/mis-compras", { waitUntil: "domcontentloaded" });
    const order = await createPickupOrderViaApi(page, productId2);
    expect(order.publicNumber).toMatch(/^VT-\d{8}$/);
    expect(order.status).toBe("procesado");

    await page.goto(`/rastreo/${encodeURIComponent(order.publicNumber)}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { name: /rastreo/i })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(order.publicNumber)).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/mis-compras", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(order.publicNumber)).toBeVisible({
      timeout: 15_000,
    });
  });
});
