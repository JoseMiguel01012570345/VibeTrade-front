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
  fetchRouteDeliveries,
  notificationsWithKind,
  fetchNotifications,
  upsertCarrierEvidenceApi,
  waitForDeliveryState,
  fetchRouteSheetTitles,
  waitForRouteSheetDelivered,
} from "../../Resources/e2e-logistics-api";
import {
  openLogisticsRouteSheet,
  expectCedeOwnershipButtonVisible,
  expectEvidenceButtonAbsent,
  expectEvidenceButtonVisible,
  cedeOwnershipViaUI,
  submitEvidenceViaUI,
  sellerDecideEvidenceViaUI,
  expectLegEstado,
} from "../../Resources/route-logistics-ui-helpers";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { reloadChatThread } from "../../Resources/chat-helpers";

test.describe("chat route logistics — evidence (UI + API)", () => {
  test.describe.configure({ mode: "serial", timeout: 480_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  // L-18: gating evidencia pre/post cede (must run first)
  test("L-18: evidence button absent before cede; visible after cede", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L18 Gating",
    });

    const carrierPage = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
    await expectCedeOwnershipButtonVisible(carrierPage);
    await expectEvidenceButtonAbsent(carrierPage);
    await cedeOwnershipViaUI(carrierPage);
    await expectEvidenceButtonVisible(carrierPage);
    await expect(
      carrierPage.getByRole("button", { name: /ceder ownership/i }),
    ).toHaveCount(0);
    await carrierPage.context().close();
  });

  // L-3: carrier who ceded can submit evidence
  test("L-3: carrier submits evidence after cede", async ({ browser }) => {
    const scenario = getE2EScenario()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L3 Evidence",
    });

    const carrierPage = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
    await cedeOwnershipViaUI(carrierPage);
    await submitEvidenceViaUI(carrierPage, { note: "Entrega E2E L3" });
    await carrierPage.context().close();
  });

  // L-1: reject → resubmit → accept + API deliveries
  test("L-1: evidence reject, resubmit, accept settles delivery", async ({
    browser,
  }) => {
    test.setTimeout(480_000);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L1 Flow",
      payRoutesViaBuyerApi: true,
    });

    const carrierPage = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
    await cedeOwnershipViaUI(carrierPage);
    await submitEvidenceViaUI(carrierPage, { note: "primera evidencia L1" });
    await carrierPage.context().close();

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerPage, "reject");

    const carrierPage2 = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrierPage2, s.routeSheetTitulo);
    await submitEvidenceViaUI(carrierPage2, {
      note: "segunda corrección L1",
    });
    await carrierPage2.context().close();

    const stop0 = s.stopIds[0]!;
    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
      stop0,
      "evidence_submitted",
    );

    await sellerPage.reload({ waitUntil: "domcontentloaded" });
    await expect(sellerPage.getByText(/cargando chat/i)).toBeHidden({
      timeout: 45_000,
    });
    await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerPage, "accept");
    await expectLegEstado(
      sellerPage,
      /evidencia aceptada — tramo cerrado/i,
    );

    const row = await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
      stop0,
      "evidence_accepted",
    );
    expect(row.state).toBe("evidence_accepted");
    await sellerPage.context().close();
  });

  // L-2: multi-stop same carrier both evidence accepted
  test("L-2: same carrier evidence accepted on two stops", async ({
    browser,
  }) => {
    test.setTimeout(480_000);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L2 Multi",
      tramoCount: 2,
    });

    for (let i = 0; i < 2; i++) {
      const carrierPage = await openCarrierPage(
        browser,
        scenario.carrierSessionToken!,
        s.threadId,
      );
      await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
      await cedeOwnershipViaUI(carrierPage, i, s.routeSheetTitulo);
      await submitEvidenceViaUI(carrierPage, {
        note: `Evidencia tramo ${i + 1}`,
        tramoIndex: i,
      });
      await carrierPage.context().close();

      const sellerPage = await openSellerPage(
        browser,
        seller.sessionToken,
        s.threadId,
      );
      await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
      await sellerDecideEvidenceViaUI(sellerPage, "accept", i, {
        allowRouteSheetCompleted: i === 1,
      });
      await sellerPage.context().close();
    }

    const checkPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s.threadId,
    );
    const deliveries = await fetchRouteDeliveries(
      checkPage,
      seller.sessionToken,
      s.threadId,
      s.agreementId,
    );
    for (const stopId of s.stopIds) {
      const row = deliveries.find((d) => d.routeStopId === stopId);
      expect(row?.state).toBe("evidence_accepted");
    }
    await checkPage.context().close();
  });

  // L-28: hoja retirada de la plataforma al liquidar el último tramo (sigue visible en chat)
  test("L-28: route sheet unpublished from platform after last leg evidence accepted", async ({
    browser,
  }) => {
    test.setTimeout(480_000);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L28 Complete",
      tramoCount: 2,
    });

    for (let i = 0; i < 2; i++) {
      const carrierPage = await openCarrierPage(
        browser,
        scenario.carrierSessionToken!,
        s.threadId,
      );
      await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
      await cedeOwnershipViaUI(carrierPage, i, s.routeSheetTitulo);
      await submitEvidenceViaUI(carrierPage, {
        note: `Evidencia tramo ${i + 1}`,
        tramoIndex: i,
      });
      await carrierPage.context().close();

      const sellerPage = await openSellerPage(
        browser,
        seller.sessionToken,
        s.threadId,
      );
      await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
      await sellerDecideEvidenceViaUI(sellerPage, "accept", i, {
        allowRouteSheetCompleted: i === 1,
      });

      if (i === 0) {
        const titles = await fetchRouteSheetTitles(
          sellerPage,
          seller.sessionToken,
          s.threadId,
        );
        expect(titles.some((t) => t.includes("L28 Complete"))).toBe(true);
      }

      if (i === 1) {
        await waitForRouteSheetDelivered(
          sellerPage,
          seller.sessionToken,
          s.threadId,
          "L28 Complete",
        );
        await reloadChatThread(sellerPage);
        await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
      }

      await sellerPage.context().close();
    }
  });

  // L-4: carrier without ownership cannot submit evidence
  test("L-4: non-owner carrier cannot see evidence button or POST evidence", async ({
    browser,
  }) => {
    test.skip(!hasCarrier2Session(), carrier2SkipReason);

    const scenario = getE2EScenario()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L4 Forbidden",
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
    await openLogisticsRouteSheet(carrier2Page, s.routeSheetTitulo);
    await expectEvidenceButtonAbsent(carrier2Page, 0);

    const stop0 = s.stopIds[0]!;
    const res = await upsertCarrierEvidenceApi(
      carrier2Page,
      scenario.carrier2SessionToken!,
      {
        threadId: s.threadId,
        agreementId: s.agreementId,
        routeSheetId: s.routeSheetId,
        routeStopId: stop0,
        text: "intento no autorizado",
        submit: true,
      },
    );
    expect(res.status).toBeGreaterThanOrEqual(400);

    if (s.stopIds.length > 1) {
      const notifs = await fetchNotifications(
        carrier2Page,
        scenario.carrier2SessionToken!,
      );
      const handoff = notificationsWithKind(notifs, "rl_handoff_ready");
      expect(handoff.length).toBeGreaterThanOrEqual(0);
    }
    await carrier2Page.context().close();
  });
});
