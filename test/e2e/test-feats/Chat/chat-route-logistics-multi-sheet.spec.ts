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
  setupPaidRouteLogisticsScenario,
  openCarrierPage,
  takeNextAgreementIndex,
} from "../../Resources/e2e-logistics-env";
import {
  fetchAgreementTitleById,
  fetchRouteDeliveries,
} from "../../Resources/e2e-logistics-api";
import {
  openLogisticsRouteSheet,
  openLiveMapModal,
  cedeOwnershipViaUI,
  submitEvidenceViaUI,
  sellerDecideEvidenceViaUI,
  expectLegEstado,
} from "../../Resources/route-logistics-ui-helpers";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { openRailContracts } from "../../Resources/chat-helpers";
import {
  openRoutesRail,
  openRouteSheetDetail,
  clickNewRouteSheet,
  waitForRouteSheetForm,
  fillRouteSheetBasicFields,
  deleteTramoAt,
  fillTramoFields,
  saveRouteSheet,
  linkRouteSheetToAgreementViaUI,
  publishRouteSheetViaUI,
  openContractByAgreementTitle,
  waitForThreadContractsLoaded,
  searchCarrierPhone,
} from "../../Resources/route-sheet-ui-helpers";
import {
  TRAMO_OPTS,
  resolveRouteSheetIdByTitulo,
} from "../../Resources/route-sheet-carriers-env";

test.describe("chat route logistics — multi sheet", () => {
  test.describe.configure({ mode: "serial", timeout: 360_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  test("L-15: evidence on sheet 1 does not change sheet 2 deliveries", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const seller = getE2ESellerSession()!;
    const s1 = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L15 A",
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      s1.threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    const titulo2 = `Hoja L15 B ${Date.now()}`;
    await openRoutesRail(sellerPage);
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    await fillRouteSheetBasicFields(sellerPage, titulo2);
    await deleteTramoAt(sellerPage, 1);
    await fillTramoFields(sellerPage, 0, TRAMO_OPTS);
    await searchCarrierPhone(sellerPage, 0, scenario.carrierPhone!);
    await saveRouteSheet(sellerPage);
    await openRailContracts(sellerPage);
    const agr2Index = takeNextAgreementIndex();
    const agr2Id = scenario.routeSheetAgreementIds![agr2Index]!;
    const agr2Title = await fetchAgreementTitleById(
      sellerPage,
      seller.sessionToken,
      s1.threadId,
      agr2Id,
    );
    await openContractByAgreementTitle(sellerPage, agr2Title);
    await linkRouteSheetToAgreementViaUI(sellerPage, titulo2);
    await openRoutesRail(sellerPage);
    await openRouteSheetDetail(sellerPage, titulo2);
    await publishRouteSheetViaUI(sellerPage);
    const sheet2Id = await resolveRouteSheetIdByTitulo(
      sellerPage,
      s1.threadId,
      seller.sessionToken,
      titulo2,
    );
    await sellerPage.context().close();

    const carrierPage = await openCarrierPage(
      browser,
      scenario.carrierSessionToken!,
      s1.threadId,
    );
    await openLogisticsRouteSheet(carrierPage, s1.routeSheetTitulo);
    await cedeOwnershipViaUI(carrierPage);
    await submitEvidenceViaUI(carrierPage, { note: "L15 sheet1 only" });
    await carrierPage.context().close();

    const sellerPage2 = await openSellerPage(
      browser,
      seller.sessionToken,
      s1.threadId,
    );
    await openLogisticsRouteSheet(sellerPage2, s1.routeSheetTitulo);
    await sellerDecideEvidenceViaUI(sellerPage2, "accept");

    const deliveries = await fetchRouteDeliveries(
      sellerPage2,
      seller.sessionToken,
      s1.threadId,
      s1.agreementId,
    );
    const sheet1Rows = deliveries.filter(
      (d) => d.routeSheetId === s1.routeSheetId,
    );
    const sheet2Rows = deliveries.filter((d) => d.routeSheetId === sheet2Id);
    expect(
      sheet1Rows.some((r) => r.state === "evidence_accepted"),
    ).toBeTruthy();
    expect(
      sheet2Rows.every(
        (r) =>
          r.state === "unpaid" ||
          r.state === "paid" ||
          !r.state ||
          r.state.length === 0,
      ) || sheet2Rows.length === 0,
    ).toBeTruthy();
    await sellerPage2.context().close();
  });

  test("L-16: dual-leg UI — cede, evidence, live map and seller accept per tramo", async ({
    browser,
  }) => {
    test.skip(!hasCarrier2Session(), carrier2SkipReason);

    const scenario = getE2EScenario()!;
    const seller = getE2ESellerSession()!;
    const s = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "Hoja L16 Complex",
      tramoCount: 2,
      carrier2Phone: scenario.carrier2Phone,
    });

    const carrierSessions = [
      scenario.carrierSessionToken!,
      scenario.carrier2SessionToken!,
    ];

    for (let i = 0; i < s.stopIds.length; i++) {
      const carrierPage = await openCarrierPage(
        browser,
        carrierSessions[i]!,
        s.threadId,
      );
      await openLogisticsRouteSheet(carrierPage, s.routeSheetTitulo);
      const liveMapBtn = carrierPage
        .getByRole("button", { name: /mapa en vivo/i })
        .first();
      if (await liveMapBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await openLiveMapModal(carrierPage);
        await carrierPage.getByRole("button", { name: /^cerrar$/i }).click();
      }
      await cedeOwnershipViaUI(carrierPage, i, s.routeSheetTitulo);
      await submitEvidenceViaUI(carrierPage, {
        note: `L16 evidencia tramo ${i + 1}`,
        tramoIndex: i,
      });
      await carrierPage.context().close();

      const sellerPage = await openSellerPage(
        browser,
        seller.sessionToken,
        s.threadId,
      );
      await openLogisticsRouteSheet(sellerPage, s.routeSheetTitulo);
      await sellerDecideEvidenceViaUI(sellerPage, "accept", i);
      await expectLegEstado(
        sellerPage,
        /evidencia aceptada — tramo cerrado/i,
        i,
      );
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
});
