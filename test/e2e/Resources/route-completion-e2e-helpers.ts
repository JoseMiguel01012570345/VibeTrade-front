import type { Browser, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { openSellerPage } from "./agreement-ui-helpers";
import { reloadChatThread } from "./chat-helpers";
import {
  payMerchandiseLinesViaBuyerApi,
  submitMerchandiseEvidenceViaApi,
  waitForHeldMerchPayment,
  waitForRouteSheetDelivered,
} from "./e2e-logistics-api";
import { openCarrierPage } from "./e2e-logistics-env";
import {
  cedeOwnershipViaUI,
  openLogisticsRouteSheet,
  sellerDecideEvidenceViaUI,
  submitEvidenceViaUI,
} from "./route-logistics-ui-helpers";
import {
  openContractByAgreementIndex,
  waitForThreadContractsLoaded,
} from "./route-sheet-ui-helpers";

export const CARRIER_TRAMO_BONUS = 2;

export async function payHeldMerchandiseViaApi(
  page: Page,
  buyerToken: string,
  threadId: string,
  agreementId: string,
): Promise<void> {
  const res = await payMerchandiseLinesViaBuyerApi(page, buyerToken, {
    threadId,
    agreementId,
  });
  expect(res.status).toBeLessThan(300);
}

export async function openAgreementEvidencePanel(
  page: Page,
  _opts: { agreementTitle: string; routeSheetTitulo?: string },
): Promise<void> {
  await reloadChatThread(page);
  await waitForThreadContractsLoaded(page);
  await openContractByAgreementIndex(page, 0);
  await expect(
    page
      .getByText(/pagos y evidencia/i)
      .or(page.getByRole("button", { name: /descargar pdf/i }))
      .first(),
  ).toBeVisible({ timeout: 30_000 });
}

export async function completeRouteDeliveryViaUI(
  browser: Browser,
  s: {
    threadId: string;
    routeSheetTitulo: string;
    agreementTitle: string;
    carrierSessionToken: string;
    sellerSessionToken: string;
  },
): Promise<void> {
  const carrierPage = await openCarrierPage(
    browser,
    s.carrierSessionToken,
    s.threadId,
  );
  await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
  await cedeOwnershipViaUI(carrierPage);
  await submitEvidenceViaUI(carrierPage, { note: "Entrega E2E" });
  await carrierPage.context().close();

  const sellerPage = await openSellerPage(
    browser,
    s.sellerSessionToken,
    s.threadId,
  );
  await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
  await sellerDecideEvidenceViaUI(sellerPage, "accept");
  await waitForRouteSheetDelivered(
    sellerPage,
    s.sellerSessionToken,
    s.threadId,
    s.routeSheetTitulo,
  );
  await sellerPage.close();
}

export async function submitMerchandiseEvidenceAsSeller(
  browser: Browser,
  s: {
    threadId: string;
    agreementId: string;
    agreementTitle: string;
    routeSheetTitulo: string;
    sellerSessionToken: string;
  },
  note: string,
): Promise<void> {
  const sellerPage = await openSellerPage(
    browser,
    s.sellerSessionToken,
    s.threadId,
  );
  await waitForHeldMerchPayment(
    sellerPage,
    s.sellerSessionToken,
    s.threadId,
    s.agreementId,
  );
  const submitStatus = await submitMerchandiseEvidenceViaApi(
    sellerPage,
    s.sellerSessionToken,
    s.threadId,
    s.agreementId,
    note,
  );
  expect(submitStatus).toBeLessThan(300);
  await sellerPage.close();
}
