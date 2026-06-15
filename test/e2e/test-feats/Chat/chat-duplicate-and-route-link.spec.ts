import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2EScenario,
  getE2ESellerSession,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import {
  rsReady,
  rsSkipReason,
} from "../../Resources/route-sheet-carriers-env";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { openRailContracts } from "../../Resources/chat-helpers";
import {
  waitForThreadContractsLoaded,
  openRoutesRail,
  clickFirstUnlinkedContract,
  openRouteSheetDetail,
  duplicateOpenContractViaUI,
  duplicateOpenRouteSheetViaUI,
  expectRouteSheetAbsentFromLinkSelect,
  clickNewRouteSheet,
  waitForRouteSheetForm,
  fillRouteSheetBasicFields,
  deleteTramoAt,
  fillTramoFields,
  saveRouteSheet,
  linkRouteSheetToAgreementViaUI,
} from "../../Resources/route-sheet-ui-helpers";

const isoTomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

function scenarioReady(): boolean {
  const s = getE2EScenario();
  return chatE2EReady() && rsReady() && !!s?.routeSheetThreadId;
}

test.describe("chat duplicate agreement/route sheet and route link restriction", () => {
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test.skip(!scenarioReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);

  test("D-1: duplicate contract from detail creates (copia) in list", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      scenario.routeSheetThreadId!,
    );

    await waitForThreadContractsLoaded(sellerPage);
    await openRailContracts(sellerPage);

    const firstContractBtn = sellerPage
      .getByRole("complementary")
      .locator("ul li button")
      .nth(0);
    await firstContractBtn.click();

    const copyTitle = await duplicateOpenContractViaUI(sellerPage);
    expect(copyTitle).toContain("(copia)");
    await expect(sellerPage.getByText(/acuerdo duplicado/i)).toBeVisible({
      timeout: 10_000,
    });

    const backBtn = sellerPage
      .getByRole("complementary")
      .getByRole("button", { name: /← volver/i });
    if (await backBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await backBtn.click();
    }

    await expect(
      sellerPage
        .getByRole("complementary")
        .getByRole("button")
        .filter({ hasText: copyTitle })
        .first(),
    ).toBeVisible({ timeout: 15_000 });

    await sellerPage.close();
  });

  test("D-2: duplicate route sheet from detail navigates to copy", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      scenario.routeSheetThreadId!,
    );

    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const sheetTitle = `Hoja Dup E2E ${Date.now()}`;
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    await fillRouteSheetBasicFields(sellerPage, sheetTitle);
    await deleteTramoAt(sellerPage, 1);
    await fillTramoFields(sellerPage, 0, {
      origen: "Origen Dup",
      destino: "Destino Dup",
      recogidaDate: isoTomorrow,
      recogidaTime: "09:00",
      entregaDate: isoTomorrow,
      entregaTime: "17:00",
      precio: "100",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "General",
    });
    await saveRouteSheet(sellerPage);
    await expect(sellerPage.getByText(/hoja de ruta creada/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await openRouteSheetDetail(sellerPage, sheetTitle);
    const copyTitle = await duplicateOpenRouteSheetViaUI(sellerPage);
    expect(copyTitle).toContain("(copia)");
    await expect(sellerPage.getByText(/hoja de ruta duplicada/i)).toBeVisible({
      timeout: 10_000,
    });

    await expect(
      sellerPage.getByRole("complementary").getByText(copyTitle).first(),
    ).toBeVisible({ timeout: 15_000 });

    await sellerPage.close();
  });

  test("D-3: route sheet linked to one contract is hidden from another contract selector", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      scenario.routeSheetThreadId!,
    );

    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const sheetTitle = `Hoja Link Dup ${Date.now()}`;
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    await fillRouteSheetBasicFields(sellerPage, sheetTitle);
    await deleteTramoAt(sellerPage, 1);
    await fillTramoFields(sellerPage, 0, {
      origen: "Origen Link",
      destino: "Destino Link",
      recogidaDate: isoTomorrow,
      recogidaTime: "09:00",
      entregaDate: isoTomorrow,
      entregaTime: "17:00",
      precio: "100",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "General",
    });
    await saveRouteSheet(sellerPage);
    await expect(sellerPage.getByText(/hoja de ruta creada/i).first()).toBeVisible({
      timeout: 15_000,
    });

    await openRailContracts(sellerPage);
    await clickFirstUnlinkedContract(sellerPage);
    await linkRouteSheetToAgreementViaUI(sellerPage, sheetTitle);

    const backBtn = sellerPage
      .getByRole("complementary")
      .getByRole("button", { name: /← volver/i });
    await backBtn.click();

    await clickFirstUnlinkedContract(sellerPage);
    await expect(
      sellerPage.getByRole("button", {
        name: /seleccionar hoja de ruta para el acuerdo/i,
      }),
    ).toBeVisible({ timeout: 8_000 });
    await expectRouteSheetAbsentFromLinkSelect(sellerPage, sheetTitle);

    await sellerPage.close();
  });
});
