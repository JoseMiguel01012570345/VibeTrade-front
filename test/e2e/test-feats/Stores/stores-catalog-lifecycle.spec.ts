import { test, expect } from "@playwright/test";
import {
  registerUserViaUI,
  readE2ESessionFromPage,
} from "../../Resources/e2e-ui-auth";
import {
  addProductViaUI,
  addServiceViaUI,
  createStoreViaUI,
  deleteProductViaUI,
  deleteStoreViaUI,
  editProductNameViaUI,
  publishCatalogItemViaUI,
} from "../../Resources/e2e-ui-store";

/** Paridad E2E con MarketCatalogIntegrationTests — CRUD tienda/catálogo. */
test.describe.configure({ mode: "serial", timeout: 180_000 });

test.describe("store catalog lifecycle E2E", () => {
  let storeId = "";
  let storeName = "";
  let productName = "";
  let sessionToken = "";

  test("creates store, product, service, edits and deletes product, deletes store", async ({
    page,
    baseURL,
  }) => {
    const suffix = Date.now().toString(36);
    storeName = `Tienda IT E2E ${suffix}`;
    productName = `Producto IT ${suffix}`;
    const serviceType = `Consultoría IT ${suffix}`;
    const editedName = `Producto IT v2 ${suffix}`;

    await registerUserViaUI(page, baseURL!);
    const session = await readE2ESessionFromPage(page);
    sessionToken = session.sessionToken;

    storeId = await createStoreViaUI(page, baseURL!, storeName);
    await addProductViaUI(page, baseURL!, storeId, productName);
    await publishCatalogItemViaUI(page, productName);
    await addServiceViaUI(page, baseURL!, storeId, serviceType);

    await editProductNameViaUI(
      page,
      baseURL!,
      storeId,
      productName,
      editedName,
    );
    await deleteProductViaUI(page, baseURL!, storeId, editedName);
    await deleteStoreViaUI(page, baseURL!, storeName);
  });
});
