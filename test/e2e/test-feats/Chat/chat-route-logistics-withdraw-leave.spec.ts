import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2EScenario,
  getE2ESellerSession,
  getE2ESession,
  hasDistinctSellerSession,
  hasCarrier2Session,
  carrier2SkipReason,
} from "../../Resources/chat-env";
import {
  rsReady,
  rsSkipReason,
  hasCarrierSession,
  carrierSkipReason,
} from "../../Resources/route-sheet-carriers-env";
import {
  setupPaidRouteLogisticsScenario,
  openCarrierPage,
} from "../../Resources/e2e-logistics-env";
import {
  waitForDeliveryState,
  postSellerExpelCarrierApi,
  postCedeOwnershipApi,
  completeLegEvidenceFlowViaApi,
  ensureStopReadyForCedeApi,
  acceptMerchandiseEvidenceViaApi,
  waitForMerchandisePaymentsReleased,
} from "../../Resources/e2e-logistics-api";
import { openAuthenticatedChatListPage, scenarioCarrierUserId, scenarioSellerStoreId } from "../../Resources/e2e-exit-policies-env";
import { fetchStoreTrustScore } from "../../Resources/e2e-trust-api";
import {
  assertNoNativeDialogDuring,
  carrierWithdrawViaChatListUI,
  confirmChatLeaveFirstStep,
  expectLeaveBlockedInModal,
  expectLeaveSuccessToast,
  expectThreadAbsentFromChatList,
  expectThreadPresentInChatList,
  fillChatLeaveReasonModal,
  openChatLeaveFlow,
  partySoftLeaveViaChatListUI,
} from "../../Resources/exit-policies-ui-helpers";
import {
  openLogisticsRouteSheet,
  cedeOwnershipViaUI,
  submitEvidenceViaUI,
  sellerDecideEvidenceViaUI,
} from "../../Resources/route-logistics-ui-helpers";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import {
  payHeldMerchandiseViaUI,
  submitMerchandiseEvidenceAsSeller,
} from "../../Resources/route-completion-e2e-helpers";

test.describe("chat route logistics — withdraw & party leave", () => {
  test.describe.configure({ mode: "serial", timeout: 480_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  // Serial order on the shared RS thread:
  // L-14/L-12 clean up rejected evidence so L-13 can leave with a settled thread.
  // L-11 runs before L-13 (L-11 ends with carrier withdraw; L-13 expels the buyer).

  test("L-14: party soft leave blocked when route evidence rejected", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L14 Leave Block",
    });

    const carrierPage = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
    await cedeOwnershipViaUI(carrierPage, 0, s.routeSheetTitulo);
    await submitEvidenceViaUI(carrierPage, { note: "L14 rejected path" });
    await carrierPage.context().close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerPage, "reject");
    await sellerPage.context().close();

    const sellerList = await openAuthenticatedChatListPage(
      browser,
      seller.sessionToken,
    );
    await openChatLeaveFlow(sellerList, s.threadId);
    await confirmChatLeaveFirstStep(sellerList);
    await fillChatLeaveReasonModal(sellerList, "Motivo L14 seller");
    await expectLeaveBlockedInModal(
      sellerList,
      /evidence|rechaz|bloque|conflict|route/i,
    );
    await expectThreadPresentInChatList(sellerList, s.threadId);
    await sellerList.context().close();

    const carrierCleanup = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrierCleanup, s.routeSheetTitulo);
    await submitEvidenceViaUI(carrierCleanup, { note: "L14 cleanup resubmit" });
    await carrierCleanup.context().close();

    const sellerCleanup = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerCleanup, s.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerCleanup, "accept");
    await sellerCleanup.context().close();
  });

  test("L-12: carrier withdraw blocked when route evidence rejected", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const seller = getE2ESellerSession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L12 Reject Block",
    });

    const carrierPage = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
    await cedeOwnershipViaUI(carrierPage, 0, s.routeSheetTitulo);
    await submitEvidenceViaUI(carrierPage, { note: "L12 reject me" });
    await carrierPage.context().close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerPage, "reject");
    await sellerPage.context().close();

    const carrierList = await openAuthenticatedChatListPage(
      browser,
      scenario.carrierSessionToken!,
    );
    await openChatLeaveFlow(carrierList, s.threadId);
    await confirmChatLeaveFirstStep(carrierList);
    await fillChatLeaveReasonModal(carrierList, "Motivo L12 carrier");
    await expect(
      carrierList
        .getByText(
          /evidence|rechaz|route|bloque|conflict|no podés salir|no puedes salir|evidencia/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 });
    await expectThreadPresentInChatList(carrierList, s.threadId);
    await carrierList.context().close();

    const carrierCleanup = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrierCleanup, s.routeSheetTitulo);
    await submitEvidenceViaUI(carrierCleanup, { note: "L12 cleanup resubmit" });
    await carrierCleanup.context().close();

    const sellerCleanup = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerCleanup, s.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerCleanup, "accept");
    await sellerCleanup.context().close();
  });

  test("L-11: carrier withdraw blocked after cede until evidence accepted", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const seller = getE2ESellerSession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L11 Withdraw",
    });

    const carrierPage = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
    await cedeOwnershipViaUI(carrierPage, 0, s.routeSheetTitulo);
    await submitEvidenceViaUI(carrierPage, { note: "L11 pending" });
    await carrierPage.context().close();

    const carrierList = await openAuthenticatedChatListPage(
      browser,
      scenario.carrierSessionToken!,
    );
    await openChatLeaveFlow(carrierList, s.threadId);
    await confirmChatLeaveFirstStep(carrierList);
    await fillChatLeaveReasonModal(carrierList, "Motivo L11 blocked");
    await expect(
      carrierList
        .getByText(
          /evidence|titularidad|ownership|pendiente|route|carga asignada|evidencia|no podés salir|no puedes salir/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 });
    await expectThreadPresentInChatList(carrierList, s.threadId);
    await carrierList.context().close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerPage, "accept");
    const stop0 = s.stopIds[0]!;
    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
      stop0,
      "evidence_accepted",
    );
    await sellerPage.context().close();

    const carrierList2 = await openAuthenticatedChatListPage(
      browser,
      scenario.carrierSessionToken!,
    );
    await assertNoNativeDialogDuring(carrierList2, async () => {
      await carrierWithdrawViaChatListUI(
        carrierList2,
        s.threadId,
        "E2E carrier withdraw L11",
      );
    });
    await expectLeaveSuccessToast(
      carrierList2,
      /transportista|des-suscribiste|salida registrada/i,
    );
    await carrierList2.context().close();
  });

  // L-11 withdraws the primary carrier; L-13 uses carrier2 when available.

  test("L-13: party soft leave succeeds when all legs evidence accepted", async ({
    browser,
  }) => {
    test.skip(!hasCarrier2Session(), carrier2SkipReason);

    const buyer = getE2ESession()!;
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const carrierToken = scenario.carrier2SessionToken!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L13 Leave OK",
      carrierPhone: scenario.carrier2Phone,
      payRoutesViaBuyerApi: true,
    });

    const carrierPage = await openCarrierPage(
      browser,
      carrierToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
    await cedeOwnershipViaUI(carrierPage, 0, s.routeSheetTitulo);
    await submitEvidenceViaUI(carrierPage, { note: "L13 done" });
    await carrierPage.context().close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerPage, "accept");
    const stop0 = s.stopIds[0]!;
    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
      stop0,
      "evidence_accepted",
    );
    await sellerPage.context().close();

    const buyerPayPage = await openSellerPage(
      browser,
      buyer.sessionToken,
      s.threadId,
    );
    await payHeldMerchandiseViaUI(buyerPayPage, s.threadId, s.agreementTitle, s.agreementId);
    await buyerPayPage.context().close();

    await submitMerchandiseEvidenceAsSeller(
      browser,
      {
        threadId: s.threadId,
        agreementId: s.agreementId,
        agreementTitle: s.agreementTitle,
        routeSheetTitulo: s.routeSheetTitulo,
        sellerSessionToken: seller.sessionToken,
      },
      "L13 merch evidence",
    );

    const buyerAcceptPage = await openSellerPage(
      browser,
      buyer.sessionToken,
      s.threadId,
    );
    const acceptStatus = await acceptMerchandiseEvidenceViaApi(
      buyerAcceptPage,
      buyer.sessionToken,
      s.threadId,
      s.agreementId,
    );
    expect(acceptStatus).toBeLessThan(300);
    await waitForMerchandisePaymentsReleased(
      buyerAcceptPage,
      buyer.sessionToken,
      s.threadId,
      s.agreementId,
    );
    await buyerAcceptPage.context().close();

    const buyerList = await openAuthenticatedChatListPage(
      browser,
      buyer.sessionToken,
    );
    await assertNoNativeDialogDuring(buyerList, async () => {
      await partySoftLeaveViaChatListUI(
        buyerList,
        s.threadId,
        "E2E party soft leave L13",
      );
    });
    await expectThreadAbsentFromChatList(buyerList, s.threadId);
    await buyerList.context().close();
  });

  test("L-15: seller expel blocked when route evidence pending after cede", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const carrierToken = scenario.carrierSessionToken!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L15 Expel Block",
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    const carrierPage = await openCarrierPage(
      browser,
      carrierToken,
      s.threadId,
    );
    const stop0 = s.stopIds[0]!;
    const ctx = {
      threadId: s.threadId,
      agreementId: s.agreementId,
      routeSheetId: s.routeSheetId,
      routeStopId: stop0,
    };
    await ensureStopReadyForCedeApi(carrierPage, carrierToken, ctx);
    const cede = await postCedeOwnershipApi(carrierPage, carrierToken, ctx);
    expect(cede.ok).toBe(true);

    const expel = await postSellerExpelCarrierApi(sellerPage, seller.sessionToken, {
      threadId: s.threadId,
      carrierUserId: scenarioCarrierUserId(),
      reason: "E2E expel con evidencia pendiente",
      routeSheetId: s.routeSheetId,
      stopId: stop0,
    });
    expect(expel.status).toBe(409);
    expect(expel.text).toMatch(/seller_expel_evidence_pending|evidencia/i);
    await sellerPage.context().close();
    await carrierPage.context().close();
  });

  test("L-16: seller expel after evidence accepted applies no store trust penalty", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const carrierToken = scenario.carrierSessionToken!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L16 Expel OK",
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    const stop0 = s.stopIds[0]!;
    await completeLegEvidenceFlowViaApi(
      sellerPage,
      carrierToken,
      seller.sessionToken,
      {
        threadId: s.threadId,
        agreementId: s.agreementId,
        routeSheetId: s.routeSheetId,
        routeStopId: stop0,
      },
    );

    const trustPage = await openAuthenticatedChatListPage(
      browser,
      seller.sessionToken,
    );
    const storeId = scenarioSellerStoreId();
    const before = await fetchStoreTrustScore(trustPage, storeId);

    const expel = await postSellerExpelCarrierApi(trustPage, seller.sessionToken, {
      threadId: s.threadId,
      carrierUserId: scenarioCarrierUserId(),
      reason: "E2E expel tras evidencia aceptada",
      routeSheetId: s.routeSheetId,
      stopId: stop0,
    });
    expect(expel.status).toBe(200);
    expect(expel.json?.applyStoreTrustPenalty).toBe(false);

    const after = await fetchStoreTrustScore(trustPage, storeId);
    expect(after).toBe(before);
    await trustPage.context().close();
    await sellerPage.context().close();
  });

  test("L-17: seller party soft leave when all agreements settled applies no trust penalty", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const carrierToken = scenario.carrierSessionToken!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L17 Seller Leave",
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    const stop0 = s.stopIds[0]!;
    await completeLegEvidenceFlowViaApi(
      sellerPage,
      carrierToken,
      seller.sessionToken,
      {
        threadId: s.threadId,
        agreementId: s.agreementId,
        routeSheetId: s.routeSheetId,
        routeStopId: stop0,
      },
    );
    await sellerPage.context().close();

    const sellerList = await openAuthenticatedChatListPage(
      browser,
      seller.sessionToken,
    );
    const storeId = scenarioSellerStoreId();
    const before = await fetchStoreTrustScore(sellerList, storeId);
    await partySoftLeaveViaChatListUI(
      sellerList,
      s.threadId,
      "E2E seller leave settled",
    );
    await expectLeaveSuccessToast(sellerList);
    const after = await fetchStoreTrustScore(sellerList, storeId);
    expect(after).toBe(before);
    await sellerList.context().close();
  });
});
