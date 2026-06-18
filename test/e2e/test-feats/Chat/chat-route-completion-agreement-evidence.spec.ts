import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2EScenario,
  getE2ESellerSession,
  getE2ESession,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import {
  rsReady,
  rsSkipReason,
  hasCarrierSession,
  carrierSkipReason,
} from "../../Resources/route-sheet-carriers-env";
import {
  fetchUserTrustScore,
  fetchStoreTrustScore,
  expectStoreTrustLedgerContains,
} from "../../Resources/e2e-trust-api";
import {
  openAuthenticatedChatListPage,
  scenarioSellerStoreId,
} from "../../Resources/e2e-exit-policies-env";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { setupPaidRouteLogisticsScenario } from "../../Resources/e2e-logistics-env";
import {
  submitMerchandiseEvidenceViaApi,
  waitForHeldMerchPayment,
} from "../../Resources/e2e-logistics-api";
import {
  openChatLeaveFlow,
  confirmChatLeaveFirstStep,
  fillChatLeaveReasonModal,
  expectLeaveBlockedInModal,
} from "../../Resources/exit-policies-ui-helpers";
import {
  CARRIER_TRAMO_BONUS,
  completeRouteDeliveryViaUI,
  openAgreementEvidencePanel,
  payHeldMerchandiseViaUI,
  submitMerchandiseEvidenceAsSeller,
} from "../../Resources/route-completion-e2e-helpers";

test.describe("chat route completion — agreement merchandise evidence", () => {
  test.describe.configure({ mode: "serial", timeout: 480_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  test("R-CE03: bloqueo de evidencia mercancía antes de ruta entregada", async ({
    browser,
  }) => {
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "R-CE03 Gate",
      payRoutes: true,
      payRoutesViaBuyerApi: true,
    });
    const seller = getE2ESellerSession()!;
    const buyer = getE2ESession()!;

    const buyerPage = await openSellerPage(
      browser,
      buyer.sessionToken,
      s.threadId,
    );
    await payHeldMerchandiseViaUI(buyerPage, s.threadId, s.agreementTitle, s.agreementId);
    await buyerPage.close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await waitForHeldMerchPayment(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
    );

    const submitStatus = await submitMerchandiseEvidenceViaApi(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
      "too early e2e",
    );
    expect(submitStatus).toBe(400);

    await openAgreementEvidencePanel(sellerPage, {
      agreementTitle: s.agreementTitle,
      routeSheetTitulo: s.routeSheetTitulo,
    });
    const addBtn = sellerPage
      .getByRole("button", { name: /añadir evidencia/i })
      .first();
    if (await addBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(addBtn).toBeDisabled();
    }
    await expect(
      sellerPage.getByText(
        /presentá la evidencia cuando la hoja de ruta esté entregada/i,
      ),
    ).toBeVisible({ timeout: 15_000 });
    await sellerPage.close();
  });

  test("R-CE02: salida bloqueada con evidencia pendiente o pagos retenidos", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const seller = getE2ESellerSession()!;
    const buyer = getE2ESession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "R-CE02 Exit",
      payRoutes: true,
      payRoutesViaBuyerApi: true,
    });

    const buyerPage = await openSellerPage(
      browser,
      buyer.sessionToken,
      s.threadId,
    );
    await payHeldMerchandiseViaUI(buyerPage, s.threadId, s.agreementTitle, s.agreementId);
    await buyerPage.close();

    await completeRouteDeliveryViaUI(browser, {
      threadId: s.threadId,
      routeSheetTitulo: s.routeSheetTitulo,
      agreementTitle: s.agreementTitle,
      carrierSessionToken: scenario.carrierSessionToken!,
      sellerSessionToken: seller.sessionToken,
    });

    await submitMerchandiseEvidenceAsSeller(
      browser,
      {
        threadId: s.threadId,
        agreementId: s.agreementId,
        agreementTitle: s.agreementTitle,
        routeSheetTitulo: s.routeSheetTitulo,
        sellerSessionToken: seller.sessionToken,
      },
      "Evidencia R-CE02 pendiente",
    );

    const sellerList = await openAuthenticatedChatListPage(
      browser,
      seller.sessionToken,
    );
    await openChatLeaveFlow(sellerList, s.threadId);
    await confirmChatLeaveFirstStep(sellerList);
    await fillChatLeaveReasonModal(sellerList, "Motivo R-CE02 seller");
    await expectLeaveBlockedInModal(sellerList, /evidencia|pendiente/i);
    await sellerList.context().close();

    const buyerRejectPage = await openSellerPage(
      browser,
      buyer.sessionToken,
      s.threadId,
    );
    await openAgreementEvidencePanel(buyerRejectPage, {
      agreementTitle: s.agreementTitle,
      routeSheetTitulo: s.routeSheetTitulo,
    });
    const rejectBtn = buyerRejectPage
      .getByRole("button", { name: /^rechazar$/i })
      .first();
    await expect(rejectBtn).toBeVisible({ timeout: 25_000 });
    await rejectBtn.click();
    await expect(
      buyerRejectPage.getByText(/evidencia:\s*rejected/i).first(),
    ).toBeVisible({ timeout: 25_000 });
    await buyerRejectPage.close();

    const buyerList = await openAuthenticatedChatListPage(
      browser,
      buyer.sessionToken,
    );
    await openChatLeaveFlow(buyerList, s.threadId);
    await confirmChatLeaveFirstStep(buyerList);
    await fillChatLeaveReasonModal(buyerList, "Motivo R-CE02 buyer");
    await expectLeaveBlockedInModal(
      buyerList,
      /held|retenido|pagos|entregas|ruta|tramo/i,
    );
    await buyerList.context().close();
  });

  test("R-CE01 + R-CE04: flujo completo y bonos de confianza", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const seller = getE2ESellerSession()!;
    const buyer = getE2ESession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "R-CE01 Complete",
      payRoutes: true,
      payRoutesViaBuyerApi: true,
    });

    const trustPage = await openAuthenticatedChatListPage(
      browser,
      seller.sessionToken,
    );
    const storeId = scenarioSellerStoreId();
    const carrierStoreId = scenario.carrierStoreId!;
    const carrierUserId = scenario.carrierUserId!;
    const buyerUserId = scenario.buyerUserId!;
    const storeBefore = await fetchStoreTrustScore(trustPage, storeId);
    const carrierStoreBefore = await fetchStoreTrustScore(trustPage, carrierStoreId);
    const carrierBefore = await fetchUserTrustScore(trustPage, carrierUserId);
    const buyerBefore = await fetchUserTrustScore(trustPage, buyerUserId);

    const buyerPage = await openSellerPage(
      browser,
      buyer.sessionToken,
      s.threadId,
    );
    await payHeldMerchandiseViaUI(buyerPage, s.threadId, s.agreementTitle, s.agreementId);
    await buyerPage.close();

    await completeRouteDeliveryViaUI(browser, {
      threadId: s.threadId,
      routeSheetTitulo: s.routeSheetTitulo,
      agreementTitle: s.agreementTitle,
      carrierSessionToken: scenario.carrierSessionToken!,
      sellerSessionToken: seller.sessionToken,
    });

    const carrierAfterPod = await fetchUserTrustScore(trustPage, carrierUserId);
    await expect
      .poll(async () => fetchStoreTrustScore(trustPage, carrierStoreId))
      .toBe(carrierStoreBefore + CARRIER_TRAMO_BONUS);
    const carrierStoreAfterPod = await fetchStoreTrustScore(
      trustPage,
      carrierStoreId,
    );
    expect(carrierAfterPod).toBe(carrierBefore);
    expect(carrierStoreAfterPod - carrierStoreBefore).toBe(CARRIER_TRAMO_BONUS);

    await submitMerchandiseEvidenceAsSeller(
      browser,
      {
        threadId: s.threadId,
        agreementId: s.agreementId,
        agreementTitle: s.agreementTitle,
        routeSheetTitulo: s.routeSheetTitulo,
        sellerSessionToken: seller.sessionToken,
      },
      "Entrega mercancía E2E R-CE01",
    );

    const buyerAcceptPage = await openSellerPage(
      browser,
      buyer.sessionToken,
      s.threadId,
    );
    await openAgreementEvidencePanel(buyerAcceptPage, {
      agreementTitle: s.agreementTitle,
      routeSheetTitulo: s.routeSheetTitulo,
    });
    const acceptBtn = buyerAcceptPage
      .getByRole("button", { name: /^aceptar$/i })
      .first();
    await expect(acceptBtn).toBeVisible({ timeout: 25_000 });
    await acceptBtn.click();
    await expect(
      buyerAcceptPage.getByText(/evidencia:\s*accepted|pago liberado/i).first(),
    ).toBeVisible({ timeout: 25_000 });
    await buyerAcceptPage.close();

    const storeAfter = await fetchStoreTrustScore(trustPage, storeId);
    const buyerAfter = await fetchUserTrustScore(trustPage, buyerUserId);
    expect(storeAfter).toBe(storeBefore + 4);
    expect(buyerAfter).toBe(buyerBefore + 2);
    await expectStoreTrustLedgerContains(
      trustPage,
      carrierStoreId,
      seller.sessionToken,
      /Tramo entregado/i,
    );
    await expectStoreTrustLedgerContains(
      trustPage,
      storeId,
      seller.sessionToken,
      /Acuerdo completado/i,
    );
    await trustPage.context().close();
  });
});
