import { sellerTest, expect } from "../../Resources/seller-auth-fixture";
import {
  chatE2EReady,
  chatE2ESkipReason,
  chatE2ESellerSkipReason,
  getE2EScenario,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";

/** Paridad E2E con ownerCatalogLists.test.tsx */
sellerTest.describe("ownerCatalogLists E2E", () => {
  sellerTest.skip(!chatE2EReady(), chatE2ESkipReason);
  sellerTest.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  sellerTest("shows publish label for catalog items", async ({ page }) => {
    const scenario = getE2EScenario()!;
    await page.goto(`/store/${scenario.storeId}/products`);
    await expect(page.getByText(/producto e2e/i).first()).toBeVisible({
      timeout: 15_000,
    });
    const row = page.locator("li").filter({ hasText: /producto e2e/i }).first();
    await expect(
      row.getByRole("button", { name: /publicar|ocultar|publicado/i }).first(),
    ).toBeVisible();
  });
});
