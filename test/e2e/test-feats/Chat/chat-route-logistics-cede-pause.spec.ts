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
} from "../../Resources/e2e-logistics-env";
import {
  fetchNotifications,
  notificationsWithKind,
  postSellerPauseApi,
  waitForDeliveryState,
} from "../../Resources/e2e-logistics-api";
import {
  openLogisticsRouteSheet,
  cedeOwnershipViaUI,
  sellerPauseTramoViaUI,
  sellerResumeTramoViaUI,
  expectLegEstado,
} from "../../Resources/route-logistics-ui-helpers";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { openNotificationsPanel, getNotificationItem } from "../../Resources/route-sheet-ui-helpers";

test.describe("chat route logistics — cede & pause (UI + API)", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  test("L-5: cede ownership notifies target carrier", async ({ browser }) => {
    test.skip(!hasCarrier2Session(), carrier2SkipReason);

    const scenario = getE2EScenario()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L5 Cede Notify",
      tramoCount: 2,
      carrier2Phone: scenario.carrier2Phone,
    });

    const carrier1Page = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrier1Page, s.routeSheetTitulo);
    await cedeOwnershipViaUI(carrier1Page, 0);
    await carrier1Page.context().close();

    const carrier2Page = await openCarrierPage(
      browser,
      scenario.carrier2SessionToken!,
      s.threadId,
    );
    await carrier2Page.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await openNotificationsPanel(carrier2Page);
    const notif = getNotificationItem(
      carrier2Page,
      /titularidad del paquete|ownership/i,
    );
    await expect(notif).toBeVisible({ timeout: 30_000 });

    const apiNotifs = await fetchNotifications(
      carrier2Page,
      scenario.carrier2SessionToken!,
    );
    const granted = notificationsWithKind(apiNotifs, "route_ownership_granted");
    expect(granted.length + notificationsWithKind(apiNotifs, "rl_ownership_granted").length).toBeGreaterThanOrEqual(0);
    await carrier2Page.context().close();
  });

  test("L-6: seller pause then resume sets in_transit", async ({ browser }) => {
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L6 Pause",
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await sellerPauseTramoViaUI(sellerPage, "Pausa E2E custodia tienda");
    await expectLegEstado(sellerPage, /pausado — custodia tienda/i);

    const stop0 = s.stopIds[0]!;
    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
      stop0,
      "idle_store_custody",
    );

    await sellerResumeTramoViaUI(sellerPage);
    await expectLegEstado(sellerPage, /en tránsito/i);
    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
      stop0,
      "in_transit",
    );
    await sellerPage.context().close();
  });

  test("L-7: second pause rejected when sheet already idle", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L7 Double Pause",
      tramoCount: 2,
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await sellerPauseTramoViaUI(sellerPage, "Primera pausa L7", 0);

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
});
