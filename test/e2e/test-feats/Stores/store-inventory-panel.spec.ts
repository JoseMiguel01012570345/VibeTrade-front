import { sellerTest, expect } from "../../Resources/seller-auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  chatE2ESellerSkipReason,
  getE2EScenario,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";

sellerTest.describe("Gestión de Inventario E2E", () => {
  sellerTest.skip(!chatE2EReady(), chatE2ESkipReason);
  sellerTest.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  sellerTest("muestra KPIs, filtros y acciones de inventario", async ({ page }) => {
    const scenario = getE2EScenario()!;
    await page.goto(`/store/${scenario.storeId}/panel/productos`);
    await expect(
      page.getByRole("heading", { name: "Gestión de Inventario" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/total productos/i)).toBeVisible();
    await expect(page.getByText(/proveedores activos/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /añadir banner/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /agregar producto/i })).toBeVisible();
    await page.getByRole("button", { name: /filtros/i }).click();
    await expect(page.getByLabel(/categoría/i).or(page.getByText(/categoría/i)).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /exportar/i })).toBeVisible();
  });
});
