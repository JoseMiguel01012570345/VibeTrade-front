import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2EScenario,
  getE2ESellerSession,
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
  expectStoreTrustLedgerContains,
  fetchStoreTrustScore,
  PARTY_EXIT_TRUST_PER_MEMBER,
} from "../../Resources/e2e-trust-api";
import {
  expectOpenTramosCountOnOfferPage,
  expectRouteSheetTramoFieldStates,
  expectThreadPresentInChatList,
  openChatLeaveFlow,
  confirmChatLeaveFirstStep,
  fillChatLeaveReasonModal,
} from "../../Resources/exit-policies-ui-helpers";
import {
  openAuthenticatedChatListPage,
  publishRouteSheetAndOpenEmergentOffer,
  scenarioSellerStoreId,
  setupPaidRouteForExitPolicies,
  setupPublishedRouteTwoTramosCarrierOnFirstOnly,
} from "../../Resources/e2e-exit-policies-env";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { reloadChatThread } from "../../Resources/chat-helpers";
import {
  openLogisticsRouteSheet,
  sellerPauseTramoViaUI,
  expectLegEstado,
} from "../../Resources/route-logistics-ui-helpers";
import {
  postSellerPauseApi,
  waitForDeliveryState,
} from "../../Resources/e2e-logistics-api";
import {
  clickEditRouteSheet,
  ensureRouteSheetDetailOpen,
  kickCarrierFromTramo,
  openRouteSheetDetail,
  openRoutesRail,
  openSubscribersPanel,
  openTramoInSubscribersPanel,
  subscribersPanel,
  subscribeCarrierToOffer,
  waitForRouteSheetForm,
} from "../../Resources/route-sheet-ui-helpers";

test.describe("chat exit policies — route lifecycle", () => {
  test.describe.configure({ mode: "serial", timeout: 480_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  test("E-X01: carrier withdraw bloqueado con tramo en pausa", async ({
    browser,
  }) => {
    const route = await setupPaidRouteForExitPolicies(browser, {
      tituloPrefix: "E-X01 Pause Block",
      payRoutes: true,
    });
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, route.routeSheetTitulo);
    await sellerPauseTramoViaUI(sellerPage, "Pausa E2E X01", 0);
    await sellerPage.close();

    const carrierList = await openAuthenticatedChatListPage(
      browser,
      scenario.carrierSessionToken!,
    );
    await openChatLeaveFlow(carrierList, route.threadId);
    await confirmChatLeaveFirstStep(carrierList);
    await fillChatLeaveReasonModal(carrierList, "Intento salir en pausa X01");
    await expect(
      carrierList
        .getByText(/ruta activa|carrier_route_active|no podés salir|tramo/i)
        .first(),
    ).toBeVisible({ timeout: 15_000 });
    await expectThreadPresentInChatList(carrierList, route.threadId);
    await carrierList.context().close();
  });

  test("E-RL01: expulsión tras pausa, penalización −3 y ledger automático", async ({
    browser,
  }) => {
    const route = await setupPaidRouteForExitPolicies(browser, {
      tituloPrefix: "E-RL01 Expel Pause",
      payRoutes: true,
    });
    const seller = getE2ESellerSession()!;
    const storeId = scenarioSellerStoreId();

    const trustPage = await openAuthenticatedChatListPage(
      browser,
      seller.sessionToken,
    );
    const trustBefore = await fetchStoreTrustScore(trustPage, storeId);

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );

    await openLogisticsRouteSheet(sellerPage, route.routeSheetTitulo);
    await sellerPauseTramoViaUI(sellerPage, "Pausa E2E RL01", 0);
    await expectLegEstado(sellerPage, /custodia|pausa/i, 0);
    const stopId = route.stopIds[0];
    expect(stopId?.length).toBeGreaterThan(0);
    const pauseOk = await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      route.threadId,
      route.agreementId,
      stopId,
      "idle_store_custody",
      15_000,
    ).then(() => true).catch(() => false);
    if (!pauseOk) {
      const pauseRes = await postSellerPauseApi(sellerPage, seller.sessionToken, {
        threadId: route.threadId,
        agreementId: route.agreementId,
        routeSheetId: route.routeSheetId,
        routeStopId: stopId,
        reason: "Pausa E2E RL01 API",
      });
      expect(pauseRes.status).toBeLessThan(300);
    }
    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      route.threadId,
      route.agreementId,
      stopId,
      "idle_store_custody",
      30_000,
    );
    await ensureRouteSheetDetailOpen(sellerPage, route.routeSheetTitulo);
    await openSubscribersPanel(sellerPage);
    await kickCarrierFromTramo(sellerPage, 1, route.routeSheetTitulo);

    const trustAfter = await fetchStoreTrustScore(trustPage, storeId);
    expect(trustAfter).toBe(trustBefore - PARTY_EXIT_TRUST_PER_MEMBER);

    await expectStoreTrustLedgerContains(
      trustPage,
      storeId,
      seller.sessionToken,
      /Transportista expulsado con tramo detenido/i,
    );

    await sellerPage.close();
    await trustPage.context().close();
  });

  test.skip(!hasCarrier2Session(), carrier2SkipReason);

  test("E-RL02: expulsión tras pausa con solicitud de suscripción", async ({
    browser,
  }) => {
    const route = await setupPaidRouteForExitPolicies(browser, {
      tituloPrefix: "E-RL02 Sub Req",
      tramoCount: 1,
      payRoutes: true,
      publish: true,
    });
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const storeId = scenarioSellerStoreId();

    const offerUrl = await (async () => {
      const sellerPage = await openSellerPage(
        browser,
        seller.sessionToken,
        route.threadId,
      );
      const url = await publishRouteSheetAndOpenEmergentOffer(
        sellerPage,
        route.routeSheetTitulo,
      );
      await sellerPage.close();
      return url;
    })();

    const carrier2Ctx = await browser.newContext();
    await carrier2Ctx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrier2SessionToken!);
    const carrier2Page = await carrier2Ctx.newPage();
    await carrier2Page.goto(offerUrl, { waitUntil: "domcontentloaded" });
    await subscribeCarrierToOffer(carrier2Page);
    await carrier2Ctx.close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );
    await openRoutesRail(sellerPage);
    await openRouteSheetDetail(sellerPage, route.routeSheetTitulo);
    await openSubscribersPanel(sellerPage);
    await openTramoInSubscribersPanel(sellerPage, 1, route.routeSheetTitulo);
    await expect(
      subscribersPanel(sellerPage).getByText(/pendiente|solicitud/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await openLogisticsRouteSheet(sellerPage, route.routeSheetTitulo);
    await sellerPauseTramoViaUI(sellerPage, "Pausa E2E RL02", 0);
    const stopId = route.stopIds[0];
    expect(stopId?.length).toBeGreaterThan(0);
    const pauseOk = await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      route.threadId,
      route.agreementId,
      stopId,
      "idle_store_custody",
      15_000,
    ).then(() => true).catch(() => false);
    if (!pauseOk) {
      const pauseRes = await postSellerPauseApi(sellerPage, seller.sessionToken, {
        threadId: route.threadId,
        agreementId: route.agreementId,
        routeSheetId: route.routeSheetId,
        routeStopId: stopId,
        reason: "Pausa E2E RL02 API",
      });
      expect(pauseRes.status).toBeLessThan(300);
    }
    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      route.threadId,
      route.agreementId,
      stopId,
      "idle_store_custody",
      30_000,
    );
    const trustPage = await openAuthenticatedChatListPage(
      browser,
      seller.sessionToken,
    );
    const trustBefore = await fetchStoreTrustScore(trustPage, storeId);
    await ensureRouteSheetDetailOpen(sellerPage, route.routeSheetTitulo);
    await openSubscribersPanel(sellerPage);
    await kickCarrierFromTramo(sellerPage, 1, route.routeSheetTitulo);
    const trustAfter = await fetchStoreTrustScore(trustPage, storeId);
    expect(trustAfter).toBe(trustBefore - PARTY_EXIT_TRUST_PER_MEMBER);
    await expectStoreTrustLedgerContains(
      trustPage,
      storeId,
      seller.sessionToken,
      /Transportista expulsado con tramo detenido/i,
    );
    await sellerPage.close();
    await trustPage.context().close();
  });

  test("E-RL03: edición bloqueada con carrier confirmado y tramo pagado", async ({
    browser,
  }) => {
    const route = await setupPaidRouteForExitPolicies(browser, {
      tituloPrefix: "E-RL03 Lock Edit",
      payRoutes: true,
    });
    const seller = getE2ESellerSession()!;
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );
    await ensureRouteSheetDetailOpen(sellerPage, route.routeSheetTitulo);
    const editBtn = sellerPage.getByRole("button", { name: /^editar$/i });
    const disabled = await editBtn.isDisabled().catch(() => false);
    if (disabled) {
      await expect(editBtn).toBeDisabled();
    } else {
      await clickEditRouteSheet(sellerPage);
      await expectRouteSheetTramoFieldStates(sellerPage, 0, {
        phoneEditable: false,
        destinationEditable: false,
      });
    }
    await sellerPage.close();
  });

  test("E-RL04: feed muestra solo tramos sin asignación", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const route = await setupPublishedRouteTwoTramosCarrierOnFirstOnly(
      browser,
      "E-RL04 Feed",
    );
    const seller = getE2ESellerSession()!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );
    const offerUrl = await publishRouteSheetAndOpenEmergentOffer(
      sellerPage,
      route.routeSheetTitulo,
    );
    await sellerPage.goto(`/chat/${route.threadId}`, {
      waitUntil: "domcontentloaded",
    });
    await reloadChatThread(sellerPage);

    const carrierFeedCtx = await browser.newContext();
    await carrierFeedCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierFeed = await carrierFeedCtx.newPage();
    await carrierFeed.goto(`${offerUrl}#hoja-suscribir`, {
      waitUntil: "domcontentloaded",
    });
    await expectOpenTramosCountOnOfferPage(carrierFeed, 1);
    await carrierFeedCtx.close();

    await openRoutesRail(sellerPage);
    await openRouteSheetDetail(sellerPage, route.routeSheetTitulo);
    await openSubscribersPanel(sellerPage);
    await kickCarrierFromTramo(sellerPage, 1, route.routeSheetTitulo);

    const carrierFeed2Ctx = await browser.newContext();
    await carrierFeed2Ctx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierFeed2 = await carrierFeed2Ctx.newPage();
    await carrierFeed2.goto(`${offerUrl}#hoja-suscribir`, {
      waitUntil: "domcontentloaded",
    });
    await expectOpenTramosCountOnOfferPage(carrierFeed2, 2);
    await carrierFeed2Ctx.close();
    await sellerPage.close();
  });

  test("E-RL05: tramo con solicitud pending no aparece en feed", async ({
    browser,
  }) => {
    const route = await setupPublishedRouteTwoTramosCarrierOnFirstOnly(
      browser,
      "E-RL05 Pending",
    );
    const scenario = getE2EScenario()!;

    const offerUrl = await (async () => {
      const seller = getE2ESellerSession()!;
      const sellerPage = await openSellerPage(
        browser,
        seller.sessionToken,
        route.threadId,
      );
      const url = await publishRouteSheetAndOpenEmergentOffer(
        sellerPage,
        route.routeSheetTitulo,
      );
      await sellerPage.close();
      return url;
    })();

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();
    await carrierPage.goto(`${offerUrl}#hoja-suscribir`, {
      waitUntil: "domcontentloaded",
    });
    await expectOpenTramosCountOnOfferPage(carrierPage, 1);
    await subscribeCarrierToOffer(carrierPage);
    await carrierPage.reload({ waitUntil: "domcontentloaded" });
    await expectOpenTramosCountOnOfferPage(carrierPage, 0);
    await carrierCtx.close();
  });
});
