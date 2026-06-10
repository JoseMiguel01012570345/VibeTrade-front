import { test, expect } from "@playwright/test";
import { registerUserViaUI } from "../../Resources/e2e-ui-auth";
import {
  addProductViaUI,
  createStoreViaUI,
  publishCatalogItemViaUI,
} from "../../Resources/e2e-ui-store";
import {
  setCatalogSearchKindsProductsOnly,
  waitForAutocompleteApiSuggestion,
  waitForAutocompleteSuggestion,
} from "../../Resources/e2e-catalog-search";
import { clearCatalogSearchPersistence } from "../../Resources/e2e-page-helpers";

/** Paridad E2E con MarketAutocompleteIntegrationTests. */
test.describe("catalog autocomplete E2E", () => {
  test("autocomplete returns published product name after seed", async ({
    page,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    const suffix = Date.now().toString(36).slice(-10);
    const productName = `ZetaAcProd_${suffix}`;

    await registerUserViaUI(page, baseURL!);
    const storeId = await createStoreViaUI(page, baseURL!, `TiendaAc_${suffix}`);
    await addProductViaUI(page, baseURL!, storeId, productName);
    await publishCatalogItemViaUI(page, productName);

    await clearCatalogSearchPersistence(page);
    await page.goto(`${baseURL}/search`, { waitUntil: "domcontentloaded" });
    await setCatalogSearchKindsProductsOnly(page);

    const prefix = productName.slice(0, Math.min(8, productName.length));
    await waitForAutocompleteApiSuggestion(page, prefix, "ZetaAcProd_", 60_000);
    await waitForAutocompleteSuggestion(page, prefix, "ZetaAcProd_", 20_000);

    const option = page
      .getByRole("listbox")
      .getByRole("option")
      .filter({ hasText: productName })
      .first();
    await option.click();
    await expect(page.getByLabel(/buscar en cat[aá]logo/i)).toHaveValue(
      productName,
    );
  });
});
