import { test } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2EScenario,
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
import { openCarrierPage } from "../../Resources/e2e-logistics-env";
import {
  openLogisticsRouteSheet,
  expectCedeOwnershipButtonAbsent,
} from "../../Resources/route-logistics-ui-helpers";
import {
  assertPayWhileCarrierInChatShowsPinAndCede,
  baseTramoFields,
  consecutiveTramoPair,
  E2E_COORDS,
  setupFlexibleRouteScenario,
} from "../../Resources/pay-live-map-helpers";

test.describe("chat route logistics — pay live map & cede ownership", () => {
  test.describe.configure({ mode: "serial", timeout: 480_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  test("L-21: single tramo — buyer pays while carrier in chat shows map pin and cede", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const s = await setupFlexibleRouteScenario(browser, {
      tituloPrefix: "Hoja L21 Pay Pin",
      tramos: [
        baseTramoFields({
          origen: "Origen L21",
          destino: "Destino L21",
          origenLat: E2E_COORDS.t1Origin.lat,
          origenLng: E2E_COORDS.t1Origin.lng,
          destinoLat: E2E_COORDS.t1Dest.lat,
          destinoLng: E2E_COORDS.t1Dest.lng,
          carrierPhone: scenario.carrierPhone!,
        }),
      ],
    });

    await assertPayWhileCarrierInChatShowsPinAndCede(
      browser,
      s,
      scenario.carrierSessionToken!,
      {
        latitude: parseFloat(E2E_COORDS.t1Origin.lat),
        longitude: parseFloat(E2E_COORDS.t1Origin.lng),
      },
      {
        ownerStopId: s.stopIds[0]!,
        cedeTramoIndex: 0,
      },
    );
  });

  test("L-22: consecutive tramos same carrier — cede only on first paid tramo", async ({
    browser,
  }) => {
    const scenario = getE2EScenario()!;
    const s = await setupFlexibleRouteScenario(browser, {
      tituloPrefix: "Hoja L22 Same Carrier",
      tramos: consecutiveTramoPair(scenario.carrierPhone!, true),
    });

    await assertPayWhileCarrierInChatShowsPinAndCede(
      browser,
      s,
      scenario.carrierSessionToken!,
      {
        latitude: parseFloat(E2E_COORDS.t1Origin.lat),
        longitude: parseFloat(E2E_COORDS.t1Origin.lng),
      },
      {
        ownerStopId: s.stopIds[0]!,
        cedeTramoIndex: 0,
        cedeAbsentTramoIndices: [1],
      },
    );
  });

  test("L-23: consecutive tramos different carriers — owner sees cede; peer does not", async ({
    browser,
  }) => {
    test.skip(!hasCarrier2Session(), carrier2SkipReason);

    const scenario = getE2EScenario()!;
    const s = await setupFlexibleRouteScenario(browser, {
      tituloPrefix: "Hoja L23 Dual Carrier",
      tramos: consecutiveTramoPair(
        scenario.carrierPhone!,
        false,
        scenario.carrier2Phone,
      ),
    });

    await assertPayWhileCarrierInChatShowsPinAndCede(
      browser,
      s,
      scenario.carrierSessionToken!,
      {
        latitude: parseFloat(E2E_COORDS.t1Origin.lat),
        longitude: parseFloat(E2E_COORDS.t1Origin.lng),
      },
      {
        ownerStopId: s.stopIds[0]!,
        cedeTramoIndex: 0,
        cedeAbsentTramoIndices: [1],
      },
    );

    const carrier2Page = await openCarrierPage(
      browser,
      scenario.carrier2SessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrier2Page, s.routeSheetTitulo);
    await expectCedeOwnershipButtonAbsent(carrier2Page, 0);
    await expectCedeOwnershipButtonAbsent(carrier2Page, 1);
    await carrier2Page.context().close();
  });

  test("L-24: linked chain — first tramo owner gets cede; second carrier waits", async ({
    browser,
  }) => {
    test.skip(!hasCarrier2Session(), carrier2SkipReason);

    const scenario = getE2EScenario()!;
    const s = await setupFlexibleRouteScenario(browser, {
      tituloPrefix: "Hoja L24 Linked",
      tramos: consecutiveTramoPair(
        scenario.carrierPhone!,
        false,
        scenario.carrier2Phone!,
      ),
    });

    await assertPayWhileCarrierInChatShowsPinAndCede(
      browser,
      s,
      scenario.carrierSessionToken!,
      {
        latitude: parseFloat(E2E_COORDS.t1Origin.lat),
        longitude: parseFloat(E2E_COORDS.t1Origin.lng),
      },
      {
        ownerStopId: s.stopIds[0]!,
        cedeTramoIndex: 0,
        cedeAbsentTramoIndices: [1],
      },
    );

    const carrier2Page = await openCarrierPage(
      browser,
      scenario.carrier2SessionToken!,
      s.threadId,
    );
    await openLogisticsRouteSheet(carrier2Page, s.routeSheetTitulo);
    await expectCedeOwnershipButtonAbsent(carrier2Page, 0);
    await expectCedeOwnershipButtonAbsent(carrier2Page, 1);
    await carrier2Page.context().close();
  });
});
