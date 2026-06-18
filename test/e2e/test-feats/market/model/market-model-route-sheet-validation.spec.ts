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
} from "../../../Resources/route-sheet-carriers-env";
import { openSellerPage } from "../../../Resources/agreement-ui-helpers";
import {
  clickNewRouteSheet,
  deleteTramoAt,
  fillRouteSheetBasicFields,
  fillTramoFields,
  formDialog,
  insertTramoAfter,
  openRoutesRail,
  saveRouteSheet,
  setTramoMapCoordsViaUI,
  waitForRouteSheetForm,
  waitForThreadContractsLoaded,
} from "../../../Resources/route-sheet-ui-helpers";

const TODAY = new Date();
const TOMORROW = new Date(TODAY);
TOMORROW.setDate(TODAY.getDate() + 1);
const DAY_AFTER = new Date(TODAY);
DAY_AFTER.setDate(TODAY.getDate() + 2);
const isoTomorrow = TOMORROW.toISOString().slice(0, 10);
const isoDayAfter = DAY_AFTER.toISOString().slice(0, 10);

const minimalTramoFields = {
  precio: "100",
  responsabilidad: "Vendedor",
  requisitos: "Ninguno",
  tipoVehiculo: "Camión",
  carga: "Carga general",
};

test.describe("route sheet validation — UI", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);

  test("RV-01: reencadena origen del tramo siguiente al mover destino", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const threadId = getE2EScenario()!.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);

    await fillRouteSheetBasicFields(
      sellerPage,
      `RV-01 Desconectado ${Date.now()}`,
    );
    await deleteTramoAt(sellerPage, 1);

    await fillTramoFields(sellerPage, 0, {
      origen: "Punto A",
      destino: "Punto B",
      origenLat: "-34.6037",
      origenLng: "-58.3816",
      destinoLat: "-34.6100",
      destinoLng: "-58.3900",
      recogidaDate: isoTomorrow,
      recogidaTime: "08:00",
      entregaDate: isoTomorrow,
      entregaTime: "12:00",
      ...minimalTramoFields,
    });

    await insertTramoAfter(sellerPage, 0);

    await fillTramoFields(sellerPage, 1, {
      origen: "Punto B",
      destino: "Punto C",
      recogidaDate: isoDayAfter,
      recogidaTime: "09:00",
      entregaDate: isoDayAfter,
      entregaTime: "15:00",
      ...minimalTramoFields,
    });

    await setTramoMapCoordsViaUI(
      sellerPage,
      0,
      "destino",
      "-34.7000",
      "-58.5000",
      "Punto B desplazado",
    );

    await expect(
      formDialog(sellerPage).locator("#ruta-tramo-1-origen"),
    ).toHaveValue("Punto B desplazado");

    await saveRouteSheet(sellerPage);
    await expect(
      sellerPage
        .getByText(/hoja de ruta creada|hoja de ruta actualizada/i)
        .first(),
    ).toBeVisible({
      timeout: 15_000,
    });

    await sellerPage.close();
  });

  test("RV-02: acepta tramos enlazados al guardar", async ({ browser }) => {
    const seller = getE2ESellerSession()!;
    const threadId = getE2EScenario()!.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);

    const titulo = `RV-02 Enlazado ${Date.now()}`;
    await fillRouteSheetBasicFields(sellerPage, titulo);
    await deleteTramoAt(sellerPage, 1);

    await fillTramoFields(sellerPage, 0, {
      origen: "Punto A",
      destino: "Punto B",
      origenLat: "-34.6037",
      origenLng: "-58.3816",
      destinoLat: "-34.6100",
      destinoLng: "-58.3900",
      recogidaDate: isoTomorrow,
      recogidaTime: "08:00",
      entregaDate: isoTomorrow,
      entregaTime: "12:00",
      ...minimalTramoFields,
    });

    await insertTramoAfter(sellerPage, 0);

    await expect(formDialog(sellerPage).locator("#ruta-tramo-1-origen")).toHaveValue(
      "Punto B",
    );

    await fillTramoFields(sellerPage, 1, {
      origen: "Punto B",
      destino: "Punto C",
      destinoLat: "-34.6200",
      destinoLng: "-58.4000",
      recogidaDate: isoDayAfter,
      recogidaTime: "09:00",
      entregaDate: isoDayAfter,
      entregaTime: "15:00",
      ...minimalTramoFields,
    });

    await saveRouteSheet(sellerPage);
    await expect(sellerPage.getByText(/hoja de ruta creada/i)).toBeVisible({
      timeout: 15_000,
    });

    await sellerPage.close();
  });
});
