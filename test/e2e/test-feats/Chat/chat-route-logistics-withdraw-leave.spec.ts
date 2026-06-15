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
  postCarrierWithdrawApi,
  postPartySoftLeaveApi,
  waitForDeliveryState,
} from "../../Resources/e2e-logistics-api";
import {
  openLogisticsRouteSheet,
  cedeOwnershipViaUI,
  submitEvidenceViaUI,
  sellerDecideEvidenceViaUI,
} from "../../Resources/route-logistics-ui-helpers";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";

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

    const sellerCtx = await browser.newContext();
    await sellerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, seller.sessionToken);
    const sellerLeavePage = await sellerCtx.newPage();
    const leave = await postPartySoftLeaveApi(
      sellerLeavePage,
      seller.sessionToken,
      s.threadId,
    );
    expect(leave.status).toBeGreaterThanOrEqual(400);
    expect(leave.text).toMatch(/evidence|rechaz|bloque|conflict|route/i);
    await sellerCtx.close();

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

    const carrierPage2 = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    const res = await postCarrierWithdrawApi(
      carrierPage2,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    await carrierPage2.context().close();

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

    const blocked = await postCarrierWithdrawApi(
      carrierPage,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    expect(blocked.status).toBeGreaterThanOrEqual(400);
    await carrierPage.context().close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerPage, "accept");
    await sellerPage.context().close();

    const carrierPage2 = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    const ok = await postCarrierWithdrawApi(
      carrierPage2,
      scenario.carrierSessionToken!,
      s.threadId,
      "E2E carrier withdraw",
      s.agreementId,
    );
    expect(ok.status).toBeLessThan(400);
    await carrierPage2.context().close();
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

    const buyerCtx = await browser.newContext();
    await buyerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, buyer.sessionToken);
    const buyerPage = await buyerCtx.newPage();
    const leave = await postPartySoftLeaveApi(
      buyerPage,
      buyer.sessionToken,
      s.threadId,
      "E2E party soft leave",
      s.agreementId,
    );
    expect(
      leave.status,
      `party-soft-leave failed (${leave.status}): ${leave.text.slice(0, 800)}`,
    ).toBeLessThan(400);
    await buyerCtx.close();
  });
});
