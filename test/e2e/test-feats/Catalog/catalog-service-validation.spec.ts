import { sellerTest, expect } from "../../Resources/seller-auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  chatE2ESellerSkipReason,
  getE2EScenario,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";

/** Paridad E2E con serviceEditorModal + validateServiceForm. */
sellerTest.describe("serviceEditorModal E2E", () => {
  sellerTest.skip(!chatE2EReady(), chatE2ESkipReason);
  sellerTest.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  sellerTest("blocks save when category is missing", async ({ page }) => {
    const { storeId } = getE2EScenario()!;
    await page.goto(`/store/${storeId}/services`);
    await page.getByRole("button", { name: /añadir servicio/i }).click();
    const dialog = page.getByRole("dialog").filter({
      has: page.locator(".vt-modal-title", { hasText: /añadir servicio/i }),
    });
    await dialog.getByLabel(/tipo de servicio/i).fill("Servicio sin cat E2E");
    await dialog.getByRole("button", { name: /guardar servicio/i }).click();
    await expect(page.getByText(/categoría|obligatorio|completa/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
