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
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { findEmergentOfferIdViaSearchApi } from "../../Resources/e2e-catalog-search";
import {
  attemptRepublishRouteSheetViaApi,
  completeLegEvidenceFlowViaApi,
  fetchRouteSheetEstado,
  payRouteStopsViaBuyerApi,
  postEmergentTramoSubscriptionRequestViaApi,
  waitForDeliveryState,
  waitForRouteSheetDelivered,
} from "../../Resources/e2e-logistics-api";
import {
  newAuthenticatedPage,
  setupPaidRouteLogisticsScenario,
} from "../../Resources/e2e-logistics-env";
import { expectOpenTramosCountOnOfferPage } from "../../Resources/exit-policies-ui-helpers";
import {
  publishRouteSheetAndOpenEmergentOffer,
  setupPublishedRouteTwoTramosCarrierOnFirstOnly,
} from "../../Resources/e2e-exit-policies-env";
import { completeRouteDeliveryViaUI } from "../../Resources/route-completion-e2e-helpers";
import { expectRepublishBlockedOnDeliveredRouteSheetViaUI } from "../../Resources/route-sheet-ui-helpers";

test.describe("chat route delivered guards — publish & subscribe", () => {
  test.describe.configure({ mode: "serial", timeout: 480_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  test("RDG-01: hoja entregada — republicar bloqueado (API y UI)", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "RDG-01 Publish Block",
      payRoutes: true,
      payRoutesViaBuyerApi: true,
    });

    await completeRouteDeliveryViaUI(browser, {
      threadId: s.threadId,
      routeSheetTitulo: s.routeSheetTitulo,
      agreementTitle: s.agreementTitle,
      carrierSessionToken: scenario.carrierSessionToken!,
      sellerSessionToken: seller.sessionToken,
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await waitForRouteSheetDelivered(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.routeSheetTitulo,
    );

    const republish = await attemptRepublishRouteSheetViaApi(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.routeSheetId,
    );
    expect(republish.status).toBe(409);
    expect(republish.error).toBe("cannot_publish_delivered_sheet");

    await expectRepublishBlockedOnDeliveredRouteSheetViaUI(
      sellerPage,
      s.routeSheetTitulo,
    );
    await sellerPage.close();
  });

  test("RDG-02: tramo entregado — suscripción bloqueada (API y oferta)", async ({
    browser,
  }) => {
    test.skip(!hasCarrier2Session(), carrier2SkipReason);

    const seller = getE2ESellerSession()!;
    const buyer = getE2ESession()!;
    const scenario = getE2EScenario()!;

    const s = await setupPublishedRouteTwoTramosCarrierOnFirstOnly(
      browser,
      "RDG-02 Sub Block",
    );

    const stop0 = s.stopIds[0];
    if (!stop0) {
      throw new Error("RDG-02: missing first stop id");
    }

    const buyerPage = await newAuthenticatedPage(browser, buyer.sessionToken);
    const payRes = await payRouteStopsViaBuyerApi(
      buyerPage,
      buyer.sessionToken,
      {
        threadId: s.threadId,
        agreementId: s.agreementId,
        routeStopIds: [stop0],
      },
    );
    expect(payRes.status).toBeLessThan(300);
    await buyerPage.context().close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );

    await completeLegEvidenceFlowViaApi(
      sellerPage,
      scenario.carrierSessionToken!,
      seller.sessionToken,
      {
        threadId: s.threadId,
        agreementId: s.agreementId,
        routeSheetId: s.routeSheetId,
        routeStopId: stop0,
      },
      { evidenceText: "RDG-02 tramo 1 entregado" },
    );

    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
      stop0,
      "evidence_accepted",
    );

    const estado = await fetchRouteSheetEstado(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.routeSheetId,
    );
    expect(estado.toLowerCase()).not.toBe("entregada");

    let emergentId: string | null = null;
    await expect
      .poll(
        async () => {
          emergentId = await findEmergentOfferIdViaSearchApi(
            sellerPage,
            seller.sessionToken,
            s.routeSheetTitulo,
          );
          return emergentId;
        },
        { timeout: 45_000 },
      )
      .not.toBeNull();

    const carrier2ServiceId = scenario.carrier2ServiceId?.trim();
    const carrier2Token = scenario.carrier2SessionToken?.trim();
    if (!carrier2ServiceId || !carrier2Token) {
      throw new Error("RDG-02: carrier2 service/token missing in scenario");
    }

    const carrier2Page = await newAuthenticatedPage(browser, carrier2Token);
    const subRes = await postEmergentTramoSubscriptionRequestViaApi(
      carrier2Page,
      carrier2Token,
      emergentId!,
      stop0,
      carrier2ServiceId,
    );
    expect(subRes.status).toBe(400);
    expect(subRes.error).toBe("stop_delivered");

    const offerUrl = await publishRouteSheetAndOpenEmergentOffer(
      sellerPage,
      s.routeSheetTitulo,
    );
    await sellerPage.close();

    await carrier2Page.goto(`${offerUrl}#hoja-suscribir`, {
      waitUntil: "domcontentloaded",
    });
    await expectOpenTramosCountOnOfferPage(carrier2Page, 1);
    await carrier2Page.context().close();
  });
});
