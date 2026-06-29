import { test, expect } from "../../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2EScenario,
  getE2ESellerSession,
  hasDistinctSellerSession,
} from "../../../Resources/chat-env";
import {
  rsReady,
  rsSkipReason,
  hasCarrierSession,
  carrierSkipReason,
} from "../../../Resources/route-sheet-carriers-env";
import { openSellerPage } from "../../../Resources/agreement-ui-helpers";
import { openCarrierPage } from "../../../Resources/e2e-logistics-env";
import {
  ensureStopReadyForCedeApi,
  postSellerPauseApi,
  waitForDeliveryState,
} from "../../../Resources/e2e-logistics-api";
import { setupPaidRouteForExitPolicies } from "../../../Resources/e2e-exit-policies-env";
import {
  openLogisticsRouteSheet,
  sellerPauseTramoViaUI,
  expectLegEstado,
  cedeOwnershipViaUI,
  submitEvidenceViaUI,
  sellerDecideEvidenceViaUI,
} from "../../../Resources/route-logistics-ui-helpers";
import {
  expelFromTramoButton,
  kickCarrierFromTramo,
  prepareSubscribersPanelForExpel,
  subscribersPanel,
} from "../../../Resources/route-sheet-ui-helpers";
import { SELLER_EXPEL_REQUIRES_PAUSE_ES } from "@features/chat/logic/route-sheet/routeSheetOfferGuards";

test.describe("seller expel guards — UI", () => {
  test.describe.configure({ mode: "serial", timeout: 480_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  test("SE-01: expulsar deshabilitado con tramo en tránsito sin pausa", async ({
    browser,
  }) => {
    const route = await setupPaidRouteForExitPolicies(browser, {
      tituloPrefix: "SE-01 InTransit Block",
      payRoutes: true,
    });
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );

    await ensureStopReadyForCedeApi(sellerPage, scenario.carrierSessionToken!, {
      threadId: route.threadId,
      agreementId: route.agreementId,
      routeSheetId: route.routeSheetId,
      routeStopId: route.stopIds[0]!,
    });

    await prepareSubscribersPanelForExpel(
      sellerPage,
      1,
      route.routeSheetTitulo,
    );

    const expelBtn = expelFromTramoButton(sellerPage);
    await expect(expelBtn).toBeDisabled({ timeout: 15_000 });
    await expect(
      subscribersPanel(sellerPage)
        .getByText(SELLER_EXPEL_REQUIRES_PAUSE_ES)
        .first(),
    ).toBeVisible();

    await sellerPage.close();
  });

  test("SE-02: expulsar habilitado tras pausar el tramo", async ({
    browser,
  }) => {
    const route = await setupPaidRouteForExitPolicies(browser, {
      tituloPrefix: "SE-02 Pause Expel",
      payRoutes: true,
    });
    const seller = getE2ESellerSession()!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );

    await openLogisticsRouteSheet(sellerPage, route.routeSheetTitulo);
    await sellerPauseTramoViaUI(sellerPage, "Pausa E2E SE-02", 0);
    await expectLegEstado(sellerPage, /custodia|pausa/i, 0);

    const stopId = route.stopIds[0]!;
    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      route.threadId,
      route.agreementId,
      stopId,
      "idle_store_custody",
      30_000,
    ).catch(async () => {
      const pauseRes = await postSellerPauseApi(sellerPage, seller.sessionToken, {
        threadId: route.threadId,
        agreementId: route.agreementId,
        routeSheetId: route.routeSheetId,
        routeStopId: stopId,
        reason: "Pausa E2E SE-02 API",
      });
      expect(pauseRes.status).toBeLessThan(300);
      await waitForDeliveryState(
        sellerPage,
        seller.sessionToken,
        route.threadId,
        route.agreementId,
        stopId,
        "idle_store_custody",
        30_000,
      );
    });

    await prepareSubscribersPanelForExpel(
      sellerPage,
      1,
      route.routeSheetTitulo,
    );
    await expect(expelFromTramoButton(sellerPage)).toBeEnabled({
      timeout: 15_000,
    });
    await kickCarrierFromTramo(sellerPage, 1, route.routeSheetTitulo);

    await sellerPage.close();
  });

  test("SE-03: expulsar deshabilitado con evidencia pendiente tras ceder", async ({
    browser,
  }) => {
    const route = await setupPaidRouteForExitPolicies(browser, {
      tituloPrefix: "SE-03 Evidence Pending",
      payRoutes: true,
    });
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;

    const carrierPage = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      route.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, route.routeSheetTitulo);
    await cedeOwnershipViaUI(carrierPage, 0, route.routeSheetTitulo);
    await carrierPage.close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );
    await prepareSubscribersPanelForExpel(
      sellerPage,
      1,
      route.routeSheetTitulo,
    );
    await expect(expelFromTramoButton(sellerPage)).toBeDisabled({
      timeout: 15_000,
    });

    await sellerPage.close();
  });

  test("SE-04: expulsar deshabilitado con evidencia rechazada", async ({
    browser,
  }) => {
    const route = await setupPaidRouteForExitPolicies(browser, {
      tituloPrefix: "SE-04 Evidence Rejected",
      payRoutes: true,
    });
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;

    const carrierPage = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      route.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, route.routeSheetTitulo);
    await cedeOwnershipViaUI(carrierPage, 0, route.routeSheetTitulo);
    await submitEvidenceViaUI(carrierPage, { note: "SE-04 evidence" });
    await carrierPage.close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, route.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerPage, "reject");

    await prepareSubscribersPanelForExpel(
      sellerPage,
      1,
      route.routeSheetTitulo,
    );
    await expect(expelFromTramoButton(sellerPage)).toBeDisabled({
      timeout: 15_000,
    });

    await sellerPage.close();
  });

  test("SE-05: expulsar habilitado tras evidencia aceptada", async ({
    browser,
  }) => {
    const route = await setupPaidRouteForExitPolicies(browser, {
      tituloPrefix: "SE-05 Evidence Accepted",
      payRoutes: true,
    });
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;

    const carrierPage = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      route.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, route.routeSheetTitulo);
    await cedeOwnershipViaUI(carrierPage, 0, route.routeSheetTitulo);
    await submitEvidenceViaUI(carrierPage, { note: "SE-05 evidence" });
    await carrierPage.close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, route.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerPage, "accept");
    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      route.threadId,
      route.agreementId,
      route.stopIds[0]!,
      "evidence_accepted",
      30_000,
    );

    await prepareSubscribersPanelForExpel(
      sellerPage,
      1,
      route.routeSheetTitulo,
    );
    await expect(expelFromTramoButton(sellerPage)).toBeEnabled({
      timeout: 15_000,
    });
    await kickCarrierFromTramo(sellerPage, 1, route.routeSheetTitulo);

    await sellerPage.close();
  });
});
