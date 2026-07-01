import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2EScenario,
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
  postSellerPauseApi,
  postCarrierTelemetryApi,
  waitForDeliveryState,
  ensureCarrierLegReadyForCede,
  postCedeOwnershipApi,
} from "../../Resources/e2e-logistics-api";
import {
  openLogisticsRouteSheet,
  expectLegEstado,
  expectSellerPauseButtonVisible,
  expectSellerPauseButtonAbsent,
  sellerPauseTramoViaUI,
} from "../../Resources/route-logistics-ui-helpers";
import {
  baseTramoFields,
  E2E_COORDS,
  setupFlexibleRouteScenario,
} from "../../Resources/pay-live-map-helpers";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { getE2ESellerSession } from "../../Resources/chat-env";
import { openChatThread, reloadChatThread, waitForChatReady } from "../../Resources/chat-helpers";
import { payAllRoutePathsAsBuyer } from "../../Resources/e2e-logistics-env";

test.describe("chat route logistics — deliveries UI per tramo", () => {
  test.describe.configure({ mode: "serial", timeout: 480_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  test("L-25: pause button only on in_transit tramo with ownership (2 tramos)", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L25 Pause Scope",
      tramoCount: 2,
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);

    await expectLegEstado(sellerPage, /en tr[aá]nsito/i, 0);
    await expectSellerPauseButtonVisible(sellerPage, 0);
    await expectSellerPauseButtonAbsent(sellerPage, 1);

    await sellerPage.context().close();
  });

  test("L-26: after pausing tramo 0, pause absent on tramo 1 while sheet idle", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L26 Pause Idle",
      tramoCount: 2,
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await sellerPauseTramoViaUI(sellerPage, "Pausa E2E tramo 0", 0);
    await expectLegEstado(sellerPage, /pausado — custodia tienda/i, 0);
    await expectSellerPauseButtonAbsent(sellerPage, 1);

    const stop1 = s.stopIds[1] ?? s.stopIds[0]!;
    const apiRes = await postSellerPauseApi(sellerPage, seller.sessionToken, {
      threadId: s.threadId,
      agreementId: s.agreementId,
      routeSheetId: s.routeSheetId,
      routeStopId: stop1,
      reason: "Segunda pausa debe fallar",
    });
    expect(apiRes.status).toBeGreaterThanOrEqual(400);

    await sellerPage.context().close();
  });

  test("L-29: after cede tramo 0, seller pause only on tramo 1 with ownership", async ({
    browser,
  }) => {
    test.skip(!hasCarrier2Session(), carrier2SkipReason);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L29 Pause Post Cede",
      tramoCount: 2,
      carrier2Phone: scenario.carrier2Phone,
    });

    const carrier1Page = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await ensureCarrierLegReadyForCede(
      carrier1Page,
      scenario.carrierSessionToken!,
      s,
      0,
    );
    const cedeRes = await postCedeOwnershipApi(
      carrier1Page,
      scenario.carrierSessionToken!,
      {
        threadId: s.threadId,
        agreementId: s.agreementId,
        routeSheetId: s.routeSheetId,
        routeStopId: s.stopIds[0]!,
      },
    );
    expect(cedeRes.ok, `cede tramo 0 failed: HTTP ${cedeRes.status}`).toBe(
      true,
    );
    await waitForDeliveryState(
      carrier1Page,
      scenario.carrierSessionToken!,
      s.threadId,
      s.agreementId,
      s.stopIds[0]!,
      "delivered_pending_evidence",
    );
    await carrier1Page.context().close();

    const carrier2Token = scenario.carrier2SessionToken!;
    const carrier2Page = await openCarrierPage(
      browser,
      carrier2Token,
      s.threadId,
    );
    await postCarrierTelemetryApi(carrier2Page, carrier2Token, {
      threadId: s.threadId,
      agreementId: s.agreementId,
      routeSheetId: s.routeSheetId,
      routeStopId: s.stopIds[1]!,
      lat: -34.6037,
      lng: -58.3816,
      reportedAtUtc: new Date().toISOString(),
      sourceClientId: "e2e_l29_in_transit",
    });
    await waitForDeliveryState(
      carrier2Page,
      carrier2Token,
      s.threadId,
      s.agreementId,
      s.stopIds[1]!,
      "in_transit",
    );
    await carrier2Page.context().close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await expectSellerPauseButtonAbsent(sellerPage, 0);
    await expectSellerPauseButtonVisible(sellerPage, 1);
    await sellerPage.context().close();
  });

  test("L-27: seller rail refreshes delivery state after buyer pays (realtime)", async ({
    browser,
  }) => {
    const buyer = getE2ESession()!;
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const s = await setupFlexibleRouteScenario(browser, {
      tituloPrefix: "Hoja L27 Realtime",
      tramos: [
        baseTramoFields({
          origen: "Origen L27",
          destino: "Destino L27",
          origenLat: E2E_COORDS.t1Origin.lat,
          origenLng: E2E_COORDS.t1Origin.lng,
          destinoLat: E2E_COORDS.t1Dest.lat,
          destinoLng: E2E_COORDS.t1Dest.lng,
          carrierPhone: scenario.carrierPhone!,
        }),
      ],
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);

    const buyerCtx = await browser.newContext();
    await buyerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, buyer.sessionToken);
    const buyerPage = await buyerCtx.newPage();
    await openChatThread(buyerPage, s.threadId);
    await waitForChatReady(buyerPage);
    await payAllRoutePathsAsBuyer(
      buyerPage,
      s.agreementTitle,
      s.routeSheetTitulo,
    );
    await buyerCtx.close();

    const stop0 = s.stopIds[0]!;
    const paidStates = ["paid", "awaiting_carrier_for_handoff", "in_transit"] as const;
    let sawPaid = false;
    for (const state of paidStates) {
      try {
        await waitForDeliveryState(
          sellerPage,
          seller.sessionToken,
          s.threadId,
          s.agreementId,
          stop0,
          state,
          90_000,
        );
        sawPaid = true;
        break;
      } catch {
        /* try next state */
      }
    }
    expect(sawPaid).toBe(true);

    await reloadChatThread(sellerPage);
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await expectLegEstado(
      sellerPage,
      /esperando transportista|handoff|cobrado|pagado|en tránsito|transito/i,
      0,
    );

    await sellerPage.context().close();
  });
});
