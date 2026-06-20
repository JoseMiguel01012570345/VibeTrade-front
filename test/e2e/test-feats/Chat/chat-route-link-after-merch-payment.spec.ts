import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2ESellerSession,
  getE2EToken,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import {
  rsReady,
  rsSkipReason,
  hasCarrierSession,
  carrierSkipReason,
} from "../../Resources/route-sheet-carriers-env";
import {
  payHeldMerchandiseAgreement,
  provisionFreshMerchandiseThread,
} from "../../Resources/e2e-exit-policies-env";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { openRailContracts } from "../../Resources/chat-helpers";
import {
  payAllRoutePathsAsBuyer,
  setupPaidRouteLogisticsScenario,
} from "../../Resources/e2e-logistics-env";
import { ensureBuyerDemoCard } from "../../Resources/payment-checkout-ui-helpers";
import {
  linkRouteSheetToAgreementViaUI,
  openContractByAgreementTitle,
  clickNewRouteSheet,
  waitForRouteSheetForm,
  openRoutesRail,
} from "../../Resources/route-sheet-ui-helpers";

test.describe("chat route link after merchandise payment", () => {
  test.describe.configure({ mode: "serial", timeout: 480_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  test("RL-AP01: vincular hoja tras cobrar mercancía y pagar tramos", async ({
    browser,
  }) => {
    const fresh = await provisionFreshMerchandiseThread(
      browser,
      "RL-AP01 Merch First",
    );

    const buyerPage = await openSellerPage(
      browser,
      getE2EToken(),
      fresh.threadId,
    );
    await ensureBuyerDemoCard(buyerPage, fresh.threadId);
    await payHeldMerchandiseAgreement(buyerPage);
    await buyerPage.close();

    const seller = getE2ESellerSession()!;
    const sellerGatePage = await openSellerPage(
      browser,
      seller.sessionToken,
      fresh.threadId,
    );
    await openRailContracts(sellerGatePage);
    await openContractByAgreementTitle(sellerGatePage, fresh.agreementTitle);
    await expect(
      sellerGatePage.getByText(
        /podés vincular una hoja de ruta para cobrar el transporte después|cobros registrados.*vincular una hoja/i,
      ).first(),
    ).toBeVisible({ timeout: 15_000 });
    await openRoutesRail(sellerGatePage);
    await clickNewRouteSheet(sellerGatePage);
    await waitForRouteSheetForm(sellerGatePage);
    await sellerGatePage.keyboard.press("Escape");
    await sellerGatePage.close();

    const route = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "RL-AP01 Route",
      threadId: fresh.threadId,
      agreementId: fresh.agreementId,
      skipLink: true,
      payRoutes: false,
    });

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      fresh.threadId,
    );
    await openRailContracts(sellerPage);
    await openContractByAgreementTitle(sellerPage, fresh.agreementTitle);
    await linkRouteSheetToAgreementViaUI(sellerPage, route.routeSheetTitulo);
    await sellerPage.close();

    const buyerPayPage = await openSellerPage(
      browser,
      getE2EToken(),
      fresh.threadId,
    );
    await payAllRoutePathsAsBuyer(
      buyerPayPage,
      fresh.agreementTitle,
      route.routeSheetTitulo,
    );
    await buyerPayPage.close();
  });

  test("RL-AP02: no cambiar vínculo si la hoja ya estaba vinculada y hubo cobros", async ({
    browser,
  }) => {
    const fresh = await provisionFreshMerchandiseThread(
      browser,
      "RL-AP02 Linked Paid",
    );

    const route = await setupPaidRouteLogisticsScenario(browser, {
      tituloPrefix: "RL-AP02 Route A",
      threadId: fresh.threadId,
      agreementId: fresh.agreementId,
      payRoutes: true,
      payRoutesViaBuyerApi: true,
    });

    const seller = getE2ESellerSession()!;
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      fresh.threadId,
    );
    await openRailContracts(sellerPage);
    await openContractByAgreementTitle(sellerPage, fresh.agreementTitle);

    await expect(
      sellerPage.getByText(/vinculada ahora a:/i).first(),
    ).toContainText(route.routeSheetTitulo, { timeout: 15_000 });
    await expect(
      sellerPage.getByText(/roadmap no se puede modificar|no se puede modificar ni quitar/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      sellerPage.getByRole("button", {
        name: /seleccionar hoja de ruta para el acuerdo/i,
      }),
    ).toBeDisabled();
    await expect(
      sellerPage.getByRole("button", { name: /^vincular$/i }),
    ).toBeDisabled();
    await sellerPage.close();
  });
});
