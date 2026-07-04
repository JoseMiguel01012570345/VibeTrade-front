import { test, expect } from "../../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2EScenario,
  getE2ESellerSession,
  getE2ESession,
  hasDistinctSellerSession,
} from "../../../Resources/chat-env";
import {
  rsReady,
  rsSkipReason,
  hasCarrierSession,
  carrierSkipReason,
} from "../../../Resources/route-sheet-carriers-env";
import { openSellerPage } from "../../../Resources/agreement-ui-helpers";
import {
  expectOpenTramosCountOnOfferPage,
  expectRouteSheetTramoFieldStates,
} from "../../../Resources/exit-policies-ui-helpers";
import {
  publishRouteSheetAndOpenEmergentOffer,
  setupPaidRouteForExitPolicies,
  setupPublishedRouteTwoTramosCarrierOnFirstOnly,
} from "../../../Resources/e2e-exit-policies-env";
import { payServiceAgreementViaBuyerApi } from "../../../Resources/e2e-logistics-api";
import {
  newAuthenticatedPage,
  type PaidLogisticsScenario,
} from "../../../Resources/e2e-logistics-env";
import {
  openLogisticsRouteSheet,
  sellerPauseTramoViaUI,
} from "../../../Resources/route-logistics-ui-helpers";
import {
  clickEditRouteSheet,
  ensureRouteSheetDetailOpen,
  expelFromTramoButton,
  kickCarrierFromTramo,
  openRoutesRail,
  prepareSubscribersPanelForExpel,
  waitForRouteSheetForm,
} from "../../../Resources/route-sheet-ui-helpers";
import { reloadChatThread } from "../../../Resources/chat-helpers";

test.describe("route sheet offer guards — paid edit UI", () => {
  test.describe.configure({ mode: "serial", timeout: 480_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  let ogVacantPaidRoute: PaidLogisticsScenario | null = null;

  test("OG-01: oferta emergente muestra solo tramos vacantes", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const route = await setupPublishedRouteTwoTramosCarrierOnFirstOnly(
      browser,
      "OG-01 Vacant",
    );
    ogVacantPaidRoute = route;
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
    await sellerPage.close();

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
    await carrierCtx.close();
  });

  test("OG-02: hoja pagada con tramo vacante permite editar contacto del tramo libre", async ({
    browser,
  }) => {
    const route = ogVacantPaidRoute;
    if (!route) {
      throw new Error("OG-02 requires OG-01 route (serial suite)");
    }
    const buyer = getE2ESession()!;

    const buyerPage = await newAuthenticatedPage(browser, buyer.sessionToken);
    const payRes = await payServiceAgreementViaBuyerApi(
      buyerPage,
      buyer.sessionToken,
      {
        threadId: route.threadId,
        agreementId: route.agreementId,
      },
    );
    if (payRes.status >= 400) {
      throw new Error(
        `OG-02 agreement payment failed (${payRes.status}): ${payRes.text}`,
      );
    }
    await buyerPage.context().close();

    const seller = getE2ESellerSession()!;
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );
    await reloadChatThread(sellerPage);
    await openRoutesRail(sellerPage);
    await ensureRouteSheetDetailOpen(sellerPage, route.routeSheetTitulo);
    await expect(
      sellerPage.getByRole("button", { name: /^editar$/i }),
    ).toBeEnabled({ timeout: 45_000 });
    await clickEditRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);

    await expectRouteSheetTramoFieldStates(sellerPage, 0, {
      phoneEditable: false,
      destinationEditable: false,
    });
    await expectRouteSheetTramoFieldStates(sellerPage, 1, {
      phoneEditable: true,
      destinationEditable: false,
    });

    await sellerPage.keyboard.press("Escape");
    await sellerPage.close();
  });

  test("OG-03: hoja pagada con todos los tramos confirmados bloquea edición estructural", async ({
    browser,
  }) => {
    const route = await setupPaidRouteForExitPolicies(browser, {
      tituloPrefix: "OG-03 Structural Lock",
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

  test("OG-04: tras expulsión en ruta pagada se desbloquea contacto del tramo vacante", async ({
    browser,
  }) => {
    const route = await setupPaidRouteForExitPolicies(browser, {
      tituloPrefix: "OG-04 Expel Unlock",
      payRoutes: true,
    });
    const seller = getE2ESellerSession()!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      route.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, route.routeSheetTitulo);
    await sellerPauseTramoViaUI(sellerPage, "Pausa OG-04", 0);
    await ensureRouteSheetDetailOpen(sellerPage, route.routeSheetTitulo);
    await prepareSubscribersPanelForExpel(
      sellerPage,
      1,
      route.routeSheetTitulo,
    );
    await expect(expelFromTramoButton(sellerPage)).toBeEnabled({
      timeout: 15_000,
    });
    await kickCarrierFromTramo(sellerPage, 1, route.routeSheetTitulo);
    await reloadChatThread(sellerPage);
    await ensureRouteSheetDetailOpen(sellerPage, route.routeSheetTitulo);
    await expect(
      sellerPage.getByRole("button", { name: /^editar$/i }),
    ).toBeEnabled({ timeout: 45_000 });
    await clickEditRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);

    await expectRouteSheetTramoFieldStates(sellerPage, 0, {
      phoneEditable: true,
      destinationEditable: false,
    });

    await sellerPage.keyboard.press("Escape");
    await sellerPage.close();
  });
});
