import type { Page } from "@playwright/test";
import type { E2ESession } from "./e2e-session";
import { logoutViaUI, registerUserViaUI } from "./e2e-ui-auth";
import {
  addProductViaUI,
  addServiceViaUI,
  createStoreViaUI,
  publishCatalogItemViaUI,
} from "./e2e-ui-store";

export type E2EChatScenario = {
  offerId: string;
  storeId: string;
  productId: string;
  productId2: string;
  serviceId: string;
  sellerUserId: string;
  buyerUserId: string;
  createdAt: string;
  /** Thread with one accepted service agreement ready for route sheet tests. */
  routeSheetThreadId?: string;
  /** ID of the first accepted agreement inside routeSheetThreadId (backward compat). */
  routeSheetAgreementId?: string;
  /** All accepted agreement IDs inside routeSheetThreadId (indices 0-5). */
  routeSheetAgreementIds?: string[];
};

export type ProvisionedChatE2E = {
  seller: E2ESession;
  buyer: E2ESession;
  scenario: E2EChatScenario;
};

/**
 * Provisiona vendedor + comprador y catálogo publicado usando solo la UI
 * (registro OTP, tienda, productos/servicio en vitrina).
 */
export async function provisionChatE2EScenario(
  page: Page,
  baseURL: string,
): Promise<ProvisionedChatE2E> {
  const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const storeName = `Tienda E2E ${suffix}`;
  const productName = `Producto E2E ${suffix}`;
  const productName2 = `Producto 2 E2E ${suffix}`;
  const serviceType = `Consultoría E2E ${suffix}`;

  const seller = await registerUserViaUI(page, baseURL);
  if (!seller.userId) {
    throw new Error("seller user id missing after UI registration");
  }

  const storeId = await createStoreViaUI(page, baseURL, storeName);

  const productId = await addProductViaUI(page, baseURL, storeId, productName);
  await publishCatalogItemViaUI(page, productName);

  const productId2 = await addProductViaUI(page, baseURL, storeId, productName2);
  await publishCatalogItemViaUI(page, productName2);

  const serviceId = await addServiceViaUI(page, baseURL, storeId, serviceType);
  await publishCatalogItemViaUI(page, serviceType);

  await logoutViaUI(page, baseURL);
  const buyer = await registerUserViaUI(page, baseURL);
  if (!buyer.userId) {
    throw new Error("buyer user id missing after UI registration");
  }
  if (buyer.userId === seller.userId) {
    throw new Error("buyer and seller must be distinct users");
  }

  const scenario: E2EChatScenario = {
    offerId: productId,
    storeId,
    productId,
    productId2,
    serviceId,
    sellerUserId: seller.userId,
    buyerUserId: buyer.userId,
    createdAt: new Date().toISOString(),
  };

  return { seller, buyer, scenario };
}
