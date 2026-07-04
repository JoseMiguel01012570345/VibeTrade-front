import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2EScenario,
  getE2ESellerSession,
  getE2ESession,
  hasDistinctSellerSession,
} from "../../Resources/chat-env";
import { openSellerPage } from "../../Resources/agreement-ui-helpers";
import { openChatThread, openRailContracts, waitForChatReady } from "../../Resources/chat-helpers";
import {
  openRoutesRail,
  openRouteSheetDetail,
  clickEditRouteSheet,
  fillTramoFields,
  saveRouteSheet,
  clickInviteCarriers,
  sendCarrierInvites,
  linkRouteSheetToAgreementViaUI,
  publishRouteSheetViaUI,
  openFirstUnlinkedContract,
} from "../../Resources/route-sheet-ui-helpers";
import {
  rsReady,
  rsSkipReason,
  hasCarrierSession,
  carrierSkipReason,
  setupRouteSheetWithCarrier,
  acceptPreselInviteAsCarrier,
  resolveRouteSheetIdByTitulo,
  TRAMO_OPTS,
} from "../../Resources/route-sheet-carriers-env";

/** Paridad E2E con RouteSheetEditSystemMessageIntegrationTests. */
test.describe("chat route sheet edit system message E2E", () => {
  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);
  test.skip(!rsReady(), rsSkipReason);
  test.skip(!hasCarrierSession(), carrierSkipReason);

  test("edit with confirmed carrier posts system notice with carrier ack hint", async ({
    browser,
  }) => {
    test.setTimeout(300_000);

    const seller = getE2ESellerSession()!;
    const buyer = getE2ESession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;
    const titulo = `Hoja Edit System ${Date.now()}`;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForChatReady(sellerPage);
    await openRoutesRail(sellerPage);

    await setupRouteSheetWithCarrier(sellerPage, {
      titulo,
      tramos: [TRAMO_OPTS],
      carrierPhone: scenario.carrierPhone!,
    });

    await openRailContracts(sellerPage);
    await openFirstUnlinkedContract(sellerPage);
    await linkRouteSheetToAgreementViaUI(sellerPage, titulo);

    await openRoutesRail(sellerPage);
    await openRouteSheetDetail(sellerPage, titulo);
    await publishRouteSheetViaUI(sellerPage);

    await clickInviteCarriers(sellerPage);
    await sendCarrierInvites(sellerPage);

    const routeSheetId = await resolveRouteSheetIdByTitulo(
      sellerPage,
      threadId,
      seller.sessionToken,
      titulo,
    );

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();
    await acceptPreselInviteAsCarrier(carrierPage, threadId, routeSheetId);
    await carrierCtx.close();

    const buyerCtx = await browser.newContext();
    await buyerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, buyer.sessionToken);
    const buyerPage = await buyerCtx.newPage();
    await openChatThread(buyerPage, threadId);
    await waitForChatReady(buyerPage);

    await openRouteSheetDetail(sellerPage, titulo);

    const sysCountBefore = await buyerPage
      .locator("[data-chat-system-message]")
      .count();

    await clickEditRouteSheet(sellerPage, titulo);
    await fillTramoFields(sellerPage, 0, {
      ...TRAMO_OPTS,
      origen: "Cercle de Goundam, Tombuctú, Malí",
      destino: "Prefectura económica de Nana-Grébizi, República Centroafricana",
    });
    await saveRouteSheet(sellerPage);

    await expect
      .poll(
        async () =>
          buyerPage.locator("[data-chat-system-message]").count(),
        { timeout: 30_000 },
      )
      .toBeGreaterThan(sysCountBefore);

    const systemMsg = buyerPage.locator("[data-chat-system-message]").last();
    await expect(systemMsg).toContainText(/hoja de ruta/i);
    await expect(systemMsg).toContainText(/editada/i);
    await expect(systemMsg).toContainText(/aceptar o rechazar/i);
    await expect(systemMsg).toContainText(/tramo 1/i);
    await expect(systemMsg).toContainText(titulo);

    await buyerCtx.close();
    await sellerPage.context().close();
  });
});
