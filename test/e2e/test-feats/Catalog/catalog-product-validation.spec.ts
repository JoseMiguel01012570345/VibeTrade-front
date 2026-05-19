import { sellerTest, expect } from "../../Resources/seller-auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  chatE2ESellerSkipReason,
  getE2EScenario,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";

/** Paridad E2E con productEditorModal + validateProductForm. */
sellerTest.describe("productEditorModal E2E", () => {
  sellerTest.skip(!chatE2EReady(), chatE2ESkipReason);
  sellerTest.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  sellerTest("blocks save when category is missing", async ({ page }) => {
    const { storeId } = getE2EScenario()!;
    await page.goto(`/store/${storeId}/products`);
    await page.getByRole("button", { name: /añadir producto/i }).click();
    const dialog = page.getByRole("dialog").filter({
      has: page.locator(".vt-modal-title", { hasText: /añadir producto/i }),
    });
    await dialog.getByLabel(/nombre del producto/i).fill("Sin categoría E2E");
    await dialog.getByRole("button", { name: /guardar producto/i }).click();
    await expect(page.getByText(/categoría|obligatorio|completa/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
