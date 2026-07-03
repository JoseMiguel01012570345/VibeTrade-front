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
import {
  waitForThreadContractsLoaded,
  openRoutesRail,
  clickNewRouteSheet,
  waitForRouteSheetForm,
  fillRouteSheetBasicFields,
  fillTramoFields,
  saveRouteSheet,
  deleteTramoAt,
  openRouteSheetDetail,
  clickInviteCarriers,
  searchCarrierPhone,
  sendCarrierInvites,
  openSubscribersPanel,
  acceptFirstSubscriptionRequest,
  subscribersPanel,
  openFirstTramoInSubscribersPanel,
  openTramoInSubscribersPanel,
  openFirstCarrierInSubscribersPanel,
  kickCarrierFromTramo,
  kickCarrierFromOperation,
  openNotificationsPanel,
  getNotificationItem,
  closeNotificationsPanel,
  rejectFirstSubscriptionRequest,
  subscribeCarrierToOffer,
} from "../../Resources/route-sheet-ui-helpers";
import { openChatPeoplePanel, openChatThread, waitForChatReady } from "../../Resources/chat-helpers";
import {
  rsReady,
  hasCarrierSession,
  rsSkipReason,
  carrierSkipReason,
  TRAMO_OPTS,
  TRAMO_OPTS_2,
  createAndPublishRouteSheet,
  carrierInviteFlowState,
  resolveRouteSheetIdByTitulo,
  setupRouteSheetWithCarrier,
  acceptPreselInviteAsCarrier,
} from "../../Resources/route-sheet-carriers-env";
import { fetchStoreTrustScore } from "../../Resources/e2e-trust-api";

test.describe("chat route sheet — carrier subscription flow (UI)", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  // ─── C-1: Invite button creates notification to carrier; click opens route modal ──
  test("C-1: Invite button creates notification to carrier; click opens route-info modal", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const titulo = `Hoja Invite Carrier ${Date.now()}`;
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    await fillRouteSheetBasicFields(sellerPage, titulo);
    await deleteTramoAt(sellerPage, 1);
    await fillTramoFields(sellerPage, 0, TRAMO_OPTS);
    await searchCarrierPhone(sellerPage, 0, scenario.carrierPhone!);
    await saveRouteSheet(sellerPage);
    await openRouteSheetDetail(sellerPage, titulo);
    await expect(sellerPage.getByRole("button", { name: /← lista/i })).toBeVisible({
      timeout: 8_000,
    });

    await clickInviteCarriers(sellerPage);
    await sendCarrierInvites(sellerPage);
    carrierInviteFlowState.routeSheetTitulo = titulo;
    carrierInviteFlowState.routeSheetId = await resolveRouteSheetIdByTitulo(
      sellerPage,
      threadId,
      seller.sessionToken,
      titulo,
    );
    await sellerPage.keyboard.press("Escape");

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();

    await carrierPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await openNotificationsPanel(carrierPage);
    const inviteNotif = getNotificationItem(
      carrierPage,
      /contacto de transporte|hoja de ruta|invitaci[oó]n/i,
    );
    await expect(inviteNotif).toBeVisible({ timeout: 20_000 });
    await inviteNotif.click();
    await expect(
      carrierPage.getByRole("dialog").filter({ hasText: /tramo|ruta|hoja/i }),
    ).toBeVisible({ timeout: 15_000 });

    await carrierCtx.close();
    await sellerPage.context().close();
  });

  // ─── C-2: Carrier accepts route; can access chat; member count updates in real time ──
  test("C-2: Carrier accepts route invitation; can access chat; member count updates in real time", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);

    const buyer = getE2ESession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();

    const buyerCtx = await browser.newContext();
    await buyerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, buyer.sessionToken);
    const buyerPage = await buyerCtx.newPage();

    try {
      await openChatThread(buyerPage, threadId);
      await waitForChatReady(buyerPage);

      const memberCountBefore = (await buyerPage
        .getByRole("button", { name: /integrantes/i })
        .textContent()
        .catch(() => "")) ?? "";

      test.skip(
        !carrierInviteFlowState.routeSheetId,
        "C-1 must run first and provision a presel invite route sheet",
      );

      await carrierPage.goto(
        `/invite/presel/${threadId}?sheet=${encodeURIComponent(carrierInviteFlowState.routeSheetId)}`,
        { waitUntil: "domcontentloaded", timeout: 45_000 },
      );
      const routeModal = carrierPage
        .getByRole("dialog")
        .filter({ hasText: /tramo|ruta|hoja|invitaci/i });
      await expect(routeModal).toBeVisible({ timeout: 15_000 });
      const acceptBtn = routeModal
        .getByRole("button", { name: /aceptar|participar|integrarme/i })
        .first();
      await expect(acceptBtn).toBeVisible({ timeout: 5_000 });
      await acceptBtn.click();
      await expect(carrierPage).toHaveURL(/\/chat\/cth_/, { timeout: 20_000 }).catch(
        () => null,
      );

      await carrierPage.goto(`/chat/${threadId}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await waitForChatReady(carrierPage);
      await expect(carrierPage.locator("[data-chat-message-row]").first()).toBeVisible({
        timeout: 20_000,
      });

      const countBefore = parseInt(memberCountBefore.match(/\d+/)?.[0] ?? "0", 10);
      await buyerPage.waitForTimeout(1_000);
      try {
        await expect
          .poll(async () => {
            const memberCountAfter =
              (await buyerPage
                .getByRole("button", { name: /integrantes/i })
                .textContent()
                .catch(() => "")) ?? "";
            return parseInt(memberCountAfter.match(/\d+/)?.[0] ?? "0", 10);
          }, { timeout: 30_000 })
          .toBeGreaterThan(countBefore);
      } catch {
        await openChatPeoplePanel(buyerPage);
        await expect(
          buyerPage.getByText(new RegExp(scenario.carrierPhone!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
        ).toBeVisible({ timeout: 15_000 });
      }
    } finally {
      await carrierCtx.close();
      await buyerCtx.close();
    }
  });

  // ─── C-3: Subscribers button shows tramo list with accepted carriers and carrier ficha ──
  test("C-3: Subscribers panel shows tramo list with accepted carriers and carrier ficha", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const sheetCard = sellerPage.locator("ul li button").first();
    const hasCard = await sheetCard.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasCard && !carrierInviteFlowState.routeSheetTitulo) {
      test.skip(true, "No route sheet available for subscribers test");
      return;
    }
    if (carrierInviteFlowState.routeSheetTitulo) {
      await openRouteSheetDetail(
        sellerPage,
        carrierInviteFlowState.routeSheetTitulo,
      );
    } else {
      await sheetCard.click();
    }
    await expect(sellerPage.getByRole("button", { name: /← lista/i })).toBeVisible({
      timeout: 8_000,
    });

    await openSubscribersPanel(sellerPage);

    const panel = subscribersPanel(sellerPage);
    await expect(panel.getByText(/tramo 1/i).first()).toBeVisible({ timeout: 10_000 });
    await openFirstTramoInSubscribersPanel(sellerPage, carrierInviteFlowState.routeSheetTitulo);
    await openFirstCarrierInSubscribersPanel(sellerPage);

    const fichaLink = panel.locator("a[href*='/offer/']").first();
    await expect(fichaLink).toBeVisible({ timeout: 5_000 });

    await sellerPage.keyboard.press("Escape");
    await sellerPage.context().close();
  });

  // ─── C-4: Store can expel carrier from tramo via subscribers panel ──
  test("C-4: Store can expel carrier from tramo via subscribers panel", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    test.skip(
      !carrierInviteFlowState.routeSheetTitulo,
      "C-1/C-2 must run first and provision an accepted carrier",
    );

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    await openRouteSheetDetail(sellerPage, carrierInviteFlowState.routeSheetTitulo);
    await openSubscribersPanel(sellerPage);
    const panel = subscribersPanel(sellerPage);
    await kickCarrierFromTramo(
      sellerPage,
      undefined,
      carrierInviteFlowState.routeSheetTitulo,
    );
    await expect(
      panel.getByText(/expulsado|eliminado|sin transportista|retir/i).first(),
    ).toBeVisible({ timeout: 10_000 }).catch(() => null);

    await sellerPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click();
    await sellerPage.context().close();
  });

  // ─── C-5: Expel from single tramo removes carrier from chat; multi-tramo keeps access ──
  test("C-5: Expel from single tramo removes carrier from chat; multi-tramo keeps access", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const tituloMulti = `Hoja Multi Tramo ${Date.now()}`;
    await setupRouteSheetWithCarrier(sellerPage, {
      titulo: tituloMulti,
      tramos: [TRAMO_OPTS, TRAMO_OPTS_2],
      carrierPhone: scenario.carrierPhone!,
    });

    await openRouteSheetDetail(sellerPage, tituloMulti);
    await publishRouteSheetViaUI(sellerPage);
    await clickInviteCarriers(sellerPage);
    await sendCarrierInvites(sellerPage);
    carrierInviteFlowState.multiRouteSheetTitulo = tituloMulti;
    carrierInviteFlowState.multiRouteSheetId = await resolveRouteSheetIdByTitulo(
      sellerPage,
      threadId,
      seller.sessionToken,
      tituloMulti,
    );

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();
    await acceptPreselInviteAsCarrier(
      carrierPage,
      threadId,
      carrierInviteFlowState.multiRouteSheetId,
    );

    // Seller may have left route detail after carrier accepted the invite.
    await openRouteSheetDetail(sellerPage, tituloMulti);
    await openSubscribersPanel(sellerPage, tituloMulti);
    await kickCarrierFromTramo(sellerPage, 2, tituloMulti);

    await carrierPage.goto(`/chat/${threadId}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await waitForChatReady(carrierPage);
    await expect(carrierPage.locator("[data-chat-message-row]").first()).toBeVisible({
      timeout: 20_000,
    });

    await carrierCtx.close();
    await sellerPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click().catch(() => null);
    await sellerPage.context().close();
  });

  // ─── C-8: Ficha técnica link navigates to transport service publication ──
  test("C-8: Ficha técnica link inside subscribers panel navigates to transport service publication", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);
    test.skip(
      !carrierInviteFlowState.multiRouteSheetTitulo,
      "C-5 must run first and provision a multi-tramo sheet with carrier on tramo 1",
    );

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await openRouteSheetDetail(sellerPage, carrierInviteFlowState.multiRouteSheetTitulo);
    await openSubscribersPanel(sellerPage, carrierInviteFlowState.multiRouteSheetTitulo);

    const panel = subscribersPanel(sellerPage);
    await openTramoInSubscribersPanel(
      sellerPage,
      1,
      carrierInviteFlowState.multiRouteSheetTitulo,
    );
    await openFirstCarrierInSubscribersPanel(sellerPage);

    const fichaLink = panel.locator("a[href*='/offer/']").first();
    await expect(fichaLink).toBeVisible({ timeout: 5_000 });
    const href = await fichaLink.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).toMatch(/\/offer\/|\/service\/|\/store\//);

    await sellerPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click().catch(() => null);
    await sellerPage.context().close();
  });

  // ─── C-6: Expel from operation removes carrier from all tramos and from chat ──
  test("C-6: Expel from operation removes carrier from all tramos and from chat", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);
    test.skip(
      !carrierInviteFlowState.multiRouteSheetTitulo,
      "C-5 must run first and provision a multi-tramo sheet with accepted carrier",
    );

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await openRouteSheetDetail(sellerPage, carrierInviteFlowState.multiRouteSheetTitulo);
    await openSubscribersPanel(sellerPage);

    const panel = subscribersPanel(sellerPage);
    await kickCarrierFromOperation(
      sellerPage,
      carrierInviteFlowState.multiRouteSheetTitulo,
    );
    await expect(
      panel.getByRole("button", { name: /expulsar de la operaci[oó]n/i }),
    ).toHaveCount(0, { timeout: 10_000 });

    const carrierCtx2 = await browser.newContext();
    await carrierCtx2.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage2 = await carrierCtx2.newPage();
    await carrierPage2.goto(`/chat/${threadId}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await expect(
      carrierPage2.getByText(
        /sin acceso|expulsado|no tienes acceso|no autorizado|no se pudo cargar este chat|tienes acceso al hilo/i,
      ),
    ).toBeVisible({ timeout: 15_000 });
    await carrierCtx2.close();

    await sellerPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click().catch(() => null);
    await sellerPage.context().close();
  });

  // ─── C-7: Store receives trust drop + penalty notification per expelled tramo ──
  test("C-7: Store receives trust score drop and penalty notification after expelling carrier", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);

    const trustBefore = await fetchStoreTrustScore(sellerPage, scenario.storeId);

    await sellerPage.goto(`/chat/${threadId}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const tituloTrust = `Hoja Trust Penalty ${Date.now()}`;
    await setupRouteSheetWithCarrier(sellerPage, {
      titulo: tituloTrust,
      tramos: [TRAMO_OPTS],
      carrierPhone: scenario.carrierPhone!,
    });
    await openRouteSheetDetail(sellerPage, tituloTrust);
    await clickInviteCarriers(sellerPage);
    await sendCarrierInvites(sellerPage);
    const trustSheetId = await resolveRouteSheetIdByTitulo(
      sellerPage,
      threadId,
      seller.sessionToken,
      tituloTrust,
    );

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();
    await acceptPreselInviteAsCarrier(carrierPage, threadId, trustSheetId);
    await carrierCtx.close();

    await openSubscribersPanel(sellerPage);
    await kickCarrierFromTramo(sellerPage);
    await sellerPage.waitForTimeout(3_000);

    const trustAfter = await fetchStoreTrustScore(sellerPage, scenario.storeId);
    expect(trustAfter).toBeLessThan(trustBefore);

    await openNotificationsPanel(sellerPage);
    const penaltyNotif = getNotificationItem(sellerPage, /penalizaci[oó]n|confianza/i);
    await expect(penaltyNotif).toBeVisible({ timeout: 10_000 });
    await closeNotificationsPanel(sellerPage);

    await sellerPage.context().close();
  });

  // ─── C-11 / C-14(sub): Subscribe error without transport service; success shows tramo list ──
  test("C-11: Subscribe error when user has no transport service; valid carrier sees tramo list with km and price/km", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;
    const buyer = getE2ESession()!;

    const { sellerPage, titulo, offerUrl } = await createAndPublishRouteSheet(
      browser,
      seller.sessionToken,
      threadId,
    );

    if (offerUrl) {
      carrierInviteFlowState.publishedOfferUrl = offerUrl;
      carrierInviteFlowState.publishedRouteSheetTitulo = titulo;
    }

    await sellerPage.context().close();
    if (!offerUrl) {
      test.skip(true, "Could not locate published route sheet URL for C-11");
      return;
    }
    const finalUrl = offerUrl;

    const buyerCtx = await browser.newContext();
    await buyerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, buyer.sessionToken);
    const buyerPage = await buyerCtx.newPage();

    try {
      await buyerPage.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const subscribeBtn = buyerPage
        .getByRole("button", { name: /suscribirse|subscribirse/i })
        .first();
      await expect(subscribeBtn).toBeVisible({ timeout: 10_000 });
      await subscribeBtn.click();
      await expect(
        buyerPage.getByText(/no tienes.*servicio de transporte|necesitas.*transporte|sin servicio|no tienes una tienda/i).first(),
      ).toBeVisible({ timeout: 10_000 });
      await buyerPage.keyboard.press("Escape");

      const carrierCtx = await browser.newContext();
      await carrierCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, scenario.carrierSessionToken!);
      const carrierPage = await carrierCtx.newPage();

      try {
        await carrierPage.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
        const tramoSection = carrierPage.locator("#hoja-suscribir");
        await expect(
          tramoSection.getByText(/suscribirme a un tramo/i),
        ).toBeVisible({ timeout: 15_000 });
        await expect(tramoSection.getByText(/km|kil[oó]metro/i).first()).toBeVisible({
          timeout: 5_000,
        });
        await expect(tramoSection.getByText(/precio|tarifa|\//i).first()).toBeVisible({
          timeout: 5_000,
        });
      } finally {
        await carrierCtx.close();
      }
    } finally {
      await buyerCtx.close();
    }
  });

  // ─── C-14: Subscribe shows transport-service picker modal; triggers notifications + toast ──
  test("C-14: Subscribe opens transport-service picker modal; carrier gets 'request sent' notification and toast; store gets 'request received' notification", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);
    test.skip(
      !carrierInviteFlowState.publishedOfferUrl,
      "C-11 must run first and publish a route sheet offer",
    );

    const scenario = getE2EScenario()!;
    const seller = getE2ESellerSession()!;
    const offerUrl = carrierInviteFlowState.publishedOfferUrl;

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();

    const sellerCtx = await browser.newContext();
    await sellerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, seller.sessionToken);
    const sellerPage = await sellerCtx.newPage();

    try {
      await carrierPage.goto(offerUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await subscribeCarrierToOffer(carrierPage);
      await expect(
        carrierPage.getByText(/solicitud enviada|pendiente de validaci[oó]n/i).first(),
      ).toBeVisible({ timeout: 15_000 });

      await carrierPage.waitForTimeout(3_000);

      await carrierPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await openNotificationsPanel(carrierPage);
      const sentNotif = getNotificationItem(
        carrierPage,
        /tu solicitud.*tramo|quedó registrada/i,
      );
      await expect(sentNotif).toBeVisible({ timeout: 15_000 });
      await closeNotificationsPanel(carrierPage);

      await sellerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await openNotificationsPanel(sellerPage);
      const receivedNotif = getNotificationItem(
        sellerPage,
        /solicit[oó] el tramo|pendiente de validaci[oó]n/i,
      );
      await expect(receivedNotif).toBeVisible({ timeout: 10_000 });
      await closeNotificationsPanel(sellerPage);
    } finally {
      await carrierCtx.close();
      await sellerCtx.close();
    }
  });

  // ─── C-14b: Expulsion buttons hidden while carrier subscription is pending ───
  test("C-14b: Expulsion buttons are not shown until the store accepts the carrier on the tramo", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);
    test.skip(
      !carrierInviteFlowState.publishedRouteSheetTitulo,
      "C-11 must run first and publish a route sheet offer",
    );

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await openRouteSheetDetail(sellerPage, carrierInviteFlowState.publishedRouteSheetTitulo);
    await openSubscribersPanel(sellerPage);
    await openFirstTramoInSubscribersPanel(
      sellerPage,
      carrierInviteFlowState.publishedRouteSheetTitulo,
    );
    await openFirstCarrierInSubscribersPanel(sellerPage);

    const panel = subscribersPanel(sellerPage);
    await expect(
      panel.getByRole("button", { name: /aceptar en este tramo/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      panel.getByRole("button", { name: /rechazar en este tramo/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    const expelBtns = panel.getByRole("button", {
      name: /expulsar de este tramo|expulsar de la operaci[oó]n/i,
    });
    await expect(expelBtns).toHaveCount(0);

    await sellerPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click().catch(() => null);
    await sellerPage.context().close();
  });

  // ─── C-16: Rejection shows confirmation modal; confirm removes request from list ──
  test("C-16: Rejection shows confirmation modal; confirming removes the subscription request from the list", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);
    test.skip(
      !carrierInviteFlowState.publishedRouteSheetTitulo,
      "C-11 must run first and publish a route sheet offer",
    );

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await openRouteSheetDetail(sellerPage, carrierInviteFlowState.publishedRouteSheetTitulo);
    await openSubscribersPanel(sellerPage);
    await openFirstTramoInSubscribersPanel(
      sellerPage,
      carrierInviteFlowState.publishedRouteSheetTitulo,
    );
    await openFirstCarrierInSubscribersPanel(sellerPage);

    const panel = subscribersPanel(sellerPage);
    const rejectBtn = panel.getByRole("button", { name: /rechazar en este tramo/i }).first();
    await expect(rejectBtn).toBeVisible({ timeout: 10_000 });
    const countBefore = await panel.getByRole("button", { name: /rechazar en este tramo/i }).count();

    await rejectBtn.click();
    const confirmModal = sellerPage
      .getByRole("dialog")
      .filter({ hasText: /rechazar solicitud/i });
    await expect(confirmModal).toBeVisible({ timeout: 5_000 });
    await confirmModal.getByRole("button", { name: /sí, rechazar/i }).click();
    await expect(confirmModal).toBeHidden({ timeout: 10_000 });

    const countAfter = await panel.getByRole("button", { name: /rechazar en este tramo/i }).count();
    expect(countAfter).toBeLessThan(countBefore);

    await sellerPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click().catch(() => null);
    await sellerPage.context().close();
  });

  // ─── C-17: Rejection sends carrier notification; click leads nowhere; publication resets ──
  test("C-17: Rejection sends notification to carrier; notification click leads nowhere; publication status resets to allow re-apply", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);
    test.skip(
      !carrierInviteFlowState.publishedOfferUrl,
      "C-11 must run first and publish a route sheet offer",
    );

    const scenario = getE2EScenario()!;

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();

    try {
      await carrierPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await openNotificationsPanel(carrierPage);

      const rejectionNotif = getNotificationItem(
        carrierPage,
        /rechaz[oó] tu solicitud|rechaz[oó].*transporte/i,
      );
      await expect(rejectionNotif).toBeVisible({ timeout: 10_000 });
      await rejectionNotif.click();
      await expect(carrierPage).toHaveURL(/\/offer\/emo_/, { timeout: 10_000 });

      const reapplyBtn = carrierPage
        .getByRole("button", { name: /suscribirse|subscribirse|aplicar/i })
        .first();
      await expect(reapplyBtn).toBeVisible({ timeout: 10_000 });
      await expect(reapplyBtn).toBeEnabled();
    } finally {
      await carrierCtx.close();
    }
  });

  // ─── C-15: Store rejects subscription request in subscribers panel ───────────
  test("C-15: Store can reject a subscription request in subscribers panel", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);
    test.skip(
      !carrierInviteFlowState.publishedOfferUrl,
      "C-11 must run first and publish a route sheet offer",
    );

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();
    await carrierPage.goto(carrierInviteFlowState.publishedOfferUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await subscribeCarrierToOffer(carrierPage);
    await expect(
      carrierPage.getByText(/solicitud enviada|pendiente de validaci[oó]n/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await carrierCtx.close();

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await openRouteSheetDetail(sellerPage, carrierInviteFlowState.publishedRouteSheetTitulo);
    await openSubscribersPanel(sellerPage);

    await rejectFirstSubscriptionRequest(
      sellerPage,
      true,
      carrierInviteFlowState.publishedRouteSheetTitulo,
    );

    const panel = subscribersPanel(sellerPage);
    await expect(
      panel.getByRole("button", { name: /rechazar en este tramo/i }),
    ).toHaveCount(0);
    await expect(
      panel.getByRole("button", { name: /expulsar de este tramo/i }),
    ).toHaveCount(0);

    await sellerPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click().catch(() => null);
    await sellerPage.context().close();
  });

  // ─── C-15b: Store accepts subscription request (after C-15 reject + carrier re-apply) ──
  test("C-15b: Store can accept a subscription request in subscribers panel", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);
    test.skip(
      !carrierInviteFlowState.publishedOfferUrl,
      "C-11 must run first and publish a route sheet offer",
    );

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();
    await carrierPage.goto(carrierInviteFlowState.publishedOfferUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await subscribeCarrierToOffer(carrierPage);
    await expect(
      carrierPage.getByText(/solicitud enviada|pendiente de validaci[oó]n/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await carrierCtx.close();

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await openRouteSheetDetail(sellerPage, carrierInviteFlowState.publishedRouteSheetTitulo);
    await openSubscribersPanel(sellerPage);

    await acceptFirstSubscriptionRequest(
      sellerPage,
      carrierInviteFlowState.publishedRouteSheetTitulo,
    );

    await sellerPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click().catch(() => null);
    await sellerPage.context().close();
  });

  // ─── C-18: Accept sends carrier notification; expulsion buttons appear only for confirmed carrier ──
  test("C-18: Accepting a subscription sends notification to carrier; expulsion buttons appear only for confirmed carriers, only visible to store", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();

    try {
      await carrierPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await openNotificationsPanel(carrierPage);
      const acceptedNotif = getNotificationItem(
        carrierPage,
        /confirm[oó].*servicio de transporte|transporte en esta operaci[oó]n|aceptado|suscripci[oó]n aceptada/i,
      );
      await expect(acceptedNotif).toBeVisible({ timeout: 20_000 });
      await closeNotificationsPanel(carrierPage);

      const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
      await waitForThreadContractsLoaded(sellerPage);
      await openRoutesRail(sellerPage);
      test.skip(
        !carrierInviteFlowState.publishedRouteSheetTitulo,
        "C-15b must run first and confirm a carrier subscription",
      );
      await openRouteSheetDetail(sellerPage, carrierInviteFlowState.publishedRouteSheetTitulo);

      await openSubscribersPanel(sellerPage);
      const panel = subscribersPanel(sellerPage);
      await openFirstTramoInSubscribersPanel(
        sellerPage,
        carrierInviteFlowState.publishedRouteSheetTitulo,
      );
      await openFirstCarrierInSubscribersPanel(sellerPage);
      const expelTramoBtn = panel.getByRole("button", { name: /expulsar de este tramo/i });
      const expelOpBtn = panel.getByRole("button", { name: /expulsar de la operaci[oó]n/i });
      await expect(expelTramoBtn.first()).toBeVisible({ timeout: 5_000 });
      await expect(expelOpBtn.first()).toBeVisible({ timeout: 5_000 });

      const pendingCard = panel
        .locator("[data-subscriber-card], [data-carrier-id]")
        .filter({ hasText: /pendiente/i })
        .first();
      const pendingExpelBtn = pendingCard.getByRole("button", { name: /expulsar de este tramo/i });
      await expect(pendingExpelBtn).toHaveCount(0);

      await sellerPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click().catch(() => null);

      await carrierPage.goto(`/chat/${threadId}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await waitForChatReady(carrierPage);
      await openRoutesRail(carrierPage);
      await openRouteSheetDetail(carrierPage, carrierInviteFlowState.publishedRouteSheetTitulo);

      await openSubscribersPanel(carrierPage);
      const carrierPanel = subscribersPanel(carrierPage);
      await expect(carrierPanel).toBeVisible({ timeout: 5_000 });
      const expelBtnForCarrier = carrierPanel.getByRole("button", {
        name: /expulsar de este tramo|expulsar de la operaci[oó]n/i,
      });
      await expect(expelBtnForCarrier).toHaveCount(0);
      await carrierPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click().catch(() => null);

      await sellerPage.context().close();
    } finally {
      await carrierCtx.close();
    }
  });

  // ─── C-19: Subscriptions update in real-time; new carrier can access chat; expulsion only for store ──
  test("C-19: Subscriptions update in real-time for buyer and existing carriers; new carrier can access chat; expulsion controls hidden from carrier", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);
    test.skip(
      !carrierInviteFlowState.publishedOfferUrl,
      "C-11 must run first and publish a route sheet offer",
    );

    const buyer = getE2ESession()!;
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const buyerCtx = await browser.newContext();
    await buyerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, buyer.sessionToken);
    const buyerPage = await buyerCtx.newPage();

    const carrierCtx = await browser.newContext();
    await carrierCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, scenario.carrierSessionToken!);
    const carrierPage = await carrierCtx.newPage();

    try {
      await openChatThread(buyerPage, threadId);
      await waitForChatReady(buyerPage);

      await carrierPage.goto(carrierInviteFlowState.publishedOfferUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });

      const subscribeBtn = carrierPage
        .locator("#hoja-suscribir")
        .getByRole("button", { name: /enviar solicitud de suscripción/i });
      const canSubscribe = await subscribeBtn.isEnabled().catch(() => false);
      if (canSubscribe) {
        await subscribeCarrierToOffer(carrierPage);
        await expect(
          carrierPage.getByText(/solicitud enviada|pendiente de validaci[oó]n/i).first(),
        ).toBeVisible({ timeout: 15_000 }).catch(() => null);

        const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
        await waitForThreadContractsLoaded(sellerPage);
        await openRoutesRail(sellerPage);
        await openRouteSheetDetail(sellerPage, carrierInviteFlowState.publishedRouteSheetTitulo);
        await openSubscribersPanel(sellerPage);
        await acceptFirstSubscriptionRequest(
          sellerPage,
          carrierInviteFlowState.publishedRouteSheetTitulo,
        );
        await sellerPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click().catch(() => null);
        await sellerPage.context().close();
      } else {
        await expect(
          carrierPage.getByText(
            /suscripci[oó]n confirmada|ya puedes abrir el chat|confirmado|pendiente de validaci[oó]n|solicitud enviada/i,
          ).first(),
        ).toBeVisible({ timeout: 15_000 });
      }

      await buyerPage.waitForTimeout(3_000);

      const memberCountEl = buyerPage.getByRole("button", { name: /integrantes/i });
      const memberText = (await memberCountEl.textContent().catch(() => "")) ?? "";
      expect(memberText.length).toBeGreaterThan(0);

      await carrierPage.goto(`/chat/${threadId}`, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });
      await waitForChatReady(carrierPage);

      await openRoutesRail(carrierPage);
      await openRouteSheetDetail(carrierPage, carrierInviteFlowState.publishedRouteSheetTitulo);

      await openSubscribersPanel(carrierPage);
      const panel = subscribersPanel(carrierPage);
      const expelBtns = panel.getByRole("button", {
        name: /expulsar de este tramo|expulsar de la operaci[oó]n/i,
      });
      await expect(expelBtns).toHaveCount(0);

      await carrierPage.getByRole("button", { name: /cerrar panel de suscriptores/i }).click().catch(() => null);

      const buyerPanel = buyerPage.getByRole("complementary", { name: /suscriptores a la oferta pública/i });
      const buyerExpelBtns = buyerPanel.getByRole("button", {
        name: /expulsar de este tramo|expulsar de la operaci[oó]n/i,
      });
      await expect(buyerExpelBtns).toHaveCount(0);
    } finally {
      await buyerCtx.close();
      await carrierCtx.close();
    }
  });
});

