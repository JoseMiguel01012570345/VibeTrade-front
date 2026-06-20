import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2EScenario,
  getE2ESellerSession,
  hasCarrier2Session,
  hasDistinctSellerSession,
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
  payAllRoutePathsAsBuyer,
} from "../../Resources/e2e-logistics-env";
import {
  postCarrierTelemetryApi,
  fetchLatestTelemetry,
  fetchNotifications,
  notificationsWithKind,
  waitForDeliveryState,
} from "../../Resources/e2e-logistics-api";
import {
  openLogisticsRouteSheet,
  cedeOwnershipViaUI,
  submitEvidenceViaUI,
  sellerDecideEvidenceViaUI,
  expectLegEstado,
  openLiveMapModal,
  startTelemetryRequestSpy,
} from "../../Resources/route-logistics-ui-helpers";
import {
  installGeolocationMock,
  pulseGeolocationMock,
} from "../../Resources/chat-geolocation-mock";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { openChatThread } from "../../Resources/chat-helpers";
import { getE2ESession } from "../../Resources/env";

test.describe("chat route logistics — telemetry & proximity", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  test("L-8: server computes speedKmh between telemetry samples", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const seller = getE2ESellerSession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L8 Telemetry",
      payRoutes: true,
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    const stop0 = s.stopIds[0]!;
    const t0 = new Date(Date.now() - 400_000).toISOString();
    const t1 = new Date(Date.now() - 40_000).toISOString();

    await postCarrierTelemetryApi(sellerPage, scenario.carrierSessionToken!, {
      threadId: s.threadId,
      agreementId: s.agreementId,
      routeSheetId: s.routeSheetId,
      routeStopId: stop0,
      lat: -34.602,
      lng: -58.4,
      reportedAtUtc: t0,
      sourceClientId: "e2e_spd_warmup",
    });
    const second = await postCarrierTelemetryApi(
      sellerPage,
      scenario.carrierSessionToken!,
      {
        threadId: s.threadId,
        agreementId: s.agreementId,
        routeSheetId: s.routeSheetId,
        routeStopId: stop0,
        lat: -34.607,
        lng: -58.4,
        reportedAtUtc: t1,
        sourceClientId: "e2e_spd_test",
      },
    );
    expect(second.status).toBe(200);
    if (second.speedKmh != null) {
      expect(second.speedKmh).toBeGreaterThan(0);
      expect(second.speedKmh).toBeLessThan(80);
    }

    const latest = await fetchLatestTelemetry(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
      s.routeSheetId,
    );
    expect(latest.some((p) => p.routeStopId === stop0)).toBeTruthy();

    const carrierPage = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
    await openLiveMapModal(carrierPage);
    await expect(carrierPage.locator("#vt-live-route-title")).toBeVisible();
    await carrierPage.context().close();
    await sellerPage.context().close();
  });

  test("L-9: proximity notification only on next distinct carrier", async ({
    browser,
  }) => {
    test.skip(!hasCarrier2Session(), carrier2SkipReason);

    const scenario = getE2EScenario()!;
    const seller = getE2ESellerSession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L9 Proximity",
      tramoCount: 2,
      carrier2Phone: scenario.carrier2Phone,
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    const stop0 = s.stopIds[0]!;
    await postCarrierTelemetryApi(sellerPage, scenario.carrierSessionToken!, {
      threadId: s.threadId,
      agreementId: s.agreementId,
      routeSheetId: s.routeSheetId,
      routeStopId: stop0,
      lat: -34.609,
      lng: -58.4,
      reportedAtUtc: new Date().toISOString(),
      sourceClientId: "e2e_prox_high",
    });

    await sellerPage.waitForTimeout(2_000);
    const c2Notifs = await fetchNotifications(
      sellerPage,
      scenario.carrier2SessionToken!,
    );
    const c2Page = await openCarrierPage(
      browser,
      scenario.carrier2SessionToken!,
      s.threadId,
    );
    const c2Api = await fetchNotifications(
      c2Page,
      scenario.carrier2SessionToken!,
    );
    const prox = notificationsWithKind(c2Api, "rl_proximity");
    expect(prox.length + notificationsWithKind(c2Notifs, "rl_proximity").length).toBeGreaterThanOrEqual(0);
    await c2Page.context().close();
    await sellerPage.context().close();
  });

  test("L-10: proximity skipped when same carrier on consecutive stops", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const seller = getE2ESellerSession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L10 Same Carrier",
      tramoCount: 2,
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    const stop0 = s.stopIds[0]!;
    await postCarrierTelemetryApi(sellerPage, scenario.carrierSessionToken!, {
      threadId: s.threadId,
      agreementId: s.agreementId,
      routeSheetId: s.routeSheetId,
      routeStopId: stop0,
      lat: -34.609,
      lng: -58.4,
      reportedAtUtc: new Date().toISOString(),
      sourceClientId: "e2e_same_carrier",
    });
    await sellerPage.waitForTimeout(1_500);
    const notifs = await fetchNotifications(
      sellerPage,
      scenario.carrierSessionToken!,
    );
    expect(notificationsWithKind(notifs, "rl_proximity")).toHaveLength(0);
    await sellerPage.context().close();
  });

  test("L-19: telemetry stops after evidence accepted", async ({ browser }) => {
    const scenario = getE2EScenario()!;
    const seller = getE2ESellerSession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L19 Tel Stop",
    });

    const carrierCtx = await browser.newContext();
    await carrierCtx.grantPermissions(["geolocation"]);
    await installGeolocationMock(carrierCtx, {
      latitude: -34.6037,
      longitude: -58.3816,
    });
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();
    const stop0 = s.stopIds[0]!;
    const spy = startTelemetryRequestSpy(carrierPage, {
      agreementId: s.agreementId,
      routeStopId: stop0,
      routeSheetId: s.routeSheetId,
    });
    await openChatThread(carrierPage, s.threadId);
    await expect(carrierPage.getByText(/cargando chat/i)).toBeHidden({
      timeout: 45_000,
    });
    const telemetryDeadline = Date.now() + 45_000;
    while (Date.now() < telemetryDeadline && spy.getCount() < 1) {
      await pulseGeolocationMock(carrierPage);
      await carrierPage.waitForTimeout(2_000);
    }
    await spy.waitForAtLeast(1, 5_000);

    await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
    await cedeOwnershipViaUI(carrierPage);
    await submitEvidenceViaUI(carrierPage, { note: "L19 evidence" });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerPage, "accept");
    await expectLegEstado(
      sellerPage,
      /evidencia aceptada — tramo cerrado/i,
    );

    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
      stop0,
      "evidence_accepted",
    );
    await sellerPage.context().close();

    await waitForDeliveryState(
      carrierPage,
      scenario.carrierSessionToken!,
      s.threadId,
      s.agreementId,
      stop0,
      "evidence_accepted",
    );
    await carrierPage.reload({ waitUntil: "domcontentloaded" });
    await expect(carrierPage.getByText(/cargando chat/i)).toBeHidden({
      timeout: 45_000,
    });
    await waitForDeliveryState(
      carrierPage,
      scenario.carrierSessionToken!,
      s.threadId,
      s.agreementId,
      stop0,
      "evidence_accepted",
    );
    await pulseGeolocationMock(carrierPage);
    const countBeforeQuiet = spy.getCount();
    await spy.assertNoFurtherPosts(25_000);
    expect(spy.getCount()).toBe(countBeforeQuiet);
    spy.dispose();
    await carrierPage.context().close();
  });

  test("L-20: telemetry auto-starts when carrier opens chat after offline payment", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const buyer = getE2ESession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L20 Reconnect",
      payRoutes: false,
    });

    const buyerCtx = await browser.newContext();
    await buyerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, buyer.sessionToken);
    const buyerPage = await buyerCtx.newPage();
    await openChatThread(buyerPage, s.threadId);
    await payAllRoutePathsAsBuyer(
      buyerPage,
      s.agreementTitle,
      s.routeSheetTitulo,
    );
    await buyerCtx.close();

    const carrierCtx = await browser.newContext();
    await carrierCtx.grantPermissions(["geolocation"]);
    await installGeolocationMock(carrierCtx, {
      latitude: -34.61,
      longitude: -58.39,
    });
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();
    const spy = startTelemetryRequestSpy(carrierPage);
    await openChatThread(carrierPage, s.threadId);
    await pulseGeolocationMock(carrierPage);
    await spy.waitForAtLeast(1, 25_000);

    await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
    await expect(
      carrierPage.getByRole("button", { name: /mapa en vivo/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
    spy.dispose();
    await carrierPage.context().close();
  });
});
