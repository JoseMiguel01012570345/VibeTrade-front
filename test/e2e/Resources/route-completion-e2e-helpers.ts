import type { Browser, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { openSellerPage } from "./agreement-ui-helpers";
import { reloadChatThread } from "./chat-helpers";
import { waitForRouteSheetDelivered } from "./e2e-logistics-api";
import { openCarrierPage } from "./e2e-logistics-env";
import {
  cedeOwnershipViaUI,
  openLogisticsRouteSheet,
  sellerDecideEvidenceViaUI,
  submitEvidenceViaUI,
} from "./route-logistics-ui-helpers";
import {
  openContractByAgreementTitle,
  waitForThreadContractsLoaded,
} from "./route-sheet-ui-helpers";

export const CARRIER_TRAMO_BONUS = 2;

export async function openAgreementEvidencePanel(
  page: Page,
  opts: { agreementTitle: string; routeSheetTitulo?: string },
): Promise<void> {
  await reloadChatThread(page);
  await waitForThreadContractsLoaded(page);
  await openContractByAgreementTitle(page, opts.agreementTitle);
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
