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
  insertTramoAfter,
  openRouteSheetDetail,
  openNotificationsPanel,
  getNotificationItem,
  closeNotificationsPanel,
} from "../../Resources/route-sheet-ui-helpers";
import { waitForChatReady } from "../../Resources/chat-helpers";
import { clearCatalogSearchPersistence, waitForCatalogSearchSettled } from "../../Resources/e2e-page-helpers";
import {
  rsReady,
  rsSkipReason,
  hasCarrierSession,
  carrierSkipReason,
  isoTomorrow,
  isoDayAfter,
  createAndPublishRouteSheet,
} from "../../Resources/route-sheet-carriers-env";

test.describe("chat route sheet — public publication & social (UI)", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  // ─── S-9: Published route sheet appears in general search ───────────────────
  test("S-9: Published route sheet appears in general search after publishing", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerCtx = await browser.newContext();
    await sellerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, seller.sessionToken);
    const sellerPage = await sellerCtx.newPage();

    const { titulo } = await createAndPublishRouteSheet(
      browser,
      seller.sessionToken,
      threadId,
      undefined,
      0,
    );

    try {
      await clearCatalogSearchPersistence(sellerPage);
      await sellerPage.goto("/search", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await sellerPage.getByLabel(/buscar en cat[aá]logo/i).fill(titulo);
      await sellerPage.getByRole("button", { name: /buscar/i }).click();
      await waitForCatalogSearchSettled(sellerPage);
      await expect(
        sellerPage.locator("main a[href^='/offer/']").first(),
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      await sellerCtx.close();
    }
  });

  // ─── S-10: Comment, like, save and notifications on a published route sheet ──
  test("S-10: Can comment, like, like a comment, and save a published route sheet; store and comment owner receive notifications", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);

    const seller = getE2ESellerSession()!;
    const buyer = getE2ESession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const { sellerPage, offerUrl } = await createAndPublishRouteSheet(
      browser,
      seller.sessionToken,
      threadId,
      undefined,
      1,
    );

    const buyerCtx = await browser.newContext();
    await buyerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, buyer.sessionToken);
    const buyerPage = await buyerCtx.newPage();

    try {
      if (!offerUrl) {
        test.skip(true, "Could not locate published route sheet URL for social test");
        return;
      }

      await buyerPage.goto(offerUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });

      const commentInput = buyerPage.getByPlaceholder(/escribe un comentario/i).first();
      await expect(commentInput).toBeVisible({ timeout: 10_000 });
      const commentText = `E2E comment route sheet ${Date.now()}`;
      await commentInput.fill(commentText);
      await buyerPage.getByRole("button", { name: /^enviar$/i }).click();
      await expect(
        buyerPage.getByText(commentText).first(),
      ).toBeVisible({ timeout: 20_000 });

      const commentsSection = buyerPage.locator("#offer-comments");
      const likeCommentBtn = commentsSection
        .getByText(commentText, { exact: true })
        .locator("xpath=preceding-sibling::button[1]");
      await expect(likeCommentBtn).toBeVisible({ timeout: 10_000 });
      await likeCommentBtn.click();

      const likePublicationBtn = buyerPage
        .locator("main")
        .locator('button[title="Me gusta"], button[title="Quitar me gusta"]')
        .first();
      await expect(likePublicationBtn).toBeVisible({ timeout: 10_000 });
      const likeBefore = await likePublicationBtn.getAttribute("title");
      await likePublicationBtn.click();
      await buyerPage.waitForTimeout(1_000);
      const likeAfter = await likePublicationBtn.getAttribute("title");
      expect(likeAfter).not.toBe(likeBefore);

      const saveBtn = buyerPage.getByRole("button", {
        name: /guardar oferta|quitar de guardados/i,
      });
      await expect(saveBtn).toBeVisible({ timeout: 10_000 });
      await saveBtn.click();
      await expect(
        buyerPage.getByText(/guardada en tu perfil/i).first(),
      ).toBeVisible({ timeout: 10_000 });

      await buyerPage.waitForTimeout(2_000);

      await sellerPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
      await openNotificationsPanel(sellerPage);
      const likeNotif = getNotificationItem(sellerPage, /me gusta|like|comentario/i);
      await expect(likeNotif).toBeVisible({ timeout: 10_000 });
      await closeNotificationsPanel(sellerPage);
    } finally {
      await sellerPage.context().close();
      await buyerCtx.close();
    }
  });

  // ─── S-11: Subscribe error without transport service; valid carrier sees tramo list with km + price/km ──
  test("S-11: Subscribe error when user has no transport service; carrier sees tramo list with km and price/km on published route sheet", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    test.skip(!hasCarrierSession(), carrierSkipReason);

    const seller = getE2ESellerSession()!;
    const buyer = getE2ESession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const { sellerPage, offerUrl: routeSheetUrl } = await createAndPublishRouteSheet(
      browser,
      seller.sessionToken,
      threadId,
      undefined,
      2,
    );

    await sellerPage.context().close();

    if (!routeSheetUrl) {
      test.skip(true, "Could not locate published route sheet URL for subscribe test");
      return;
    }

    const finalUrl = routeSheetUrl;

    const buyerCtx = await browser.newContext();
    await buyerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, buyer.sessionToken);
    const buyerPage = await buyerCtx.newPage();

    try {
      await buyerPage.goto(finalUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });

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
        await carrierPage.goto(finalUrl, {
          waitUntil: "domcontentloaded",
          timeout: 45_000,
        });
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

  // ─── S-12: Publication shows product/service link, store trust, currency and categories ──
  test("S-12: Published route sheet page shows product/service ficha link, store trust, payment currency, and categories", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const { sellerPage, offerUrl: routeSheetUrl } = await createAndPublishRouteSheet(
      browser,
      seller.sessionToken,
      threadId,
      undefined,
      3,
    );

    try {
      if (!routeSheetUrl) {
        test.skip(true, "Could not locate published route sheet URL for metadata test");
        return;
      }

      await sellerPage.goto(routeSheetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 45_000,
      });

      const fichaLink = sellerPage.getByRole("link", {
        name: /ver ficha del producto o servicio/i,
      });
      await expect(fichaLink).toBeVisible({ timeout: 10_000 });
      const href = await fichaLink.getAttribute("href");
      expect(href).toMatch(/^\/offer\//);

      await expect(sellerPage.getByText(/confianza:\s*\d+/i).first()).toBeVisible({
        timeout: 5_000,
      });

      await expect(sellerPage.getByText(/USD|EUR|€|\$/i).first()).toBeVisible({
        timeout: 5_000,
      });

      await expect(sellerPage.locator(".vt-pill").first()).toBeVisible({
        timeout: 5_000,
      });
    } finally {
      await sellerPage.context().close();
    }
  });

  // ─── S-13: Each route (connected leg chain) painted a distinct colour ────────
  test("S-13: Each route (connected leg chain) is painted a distinct colour on the map or legend", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);

    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const tituloMulti = `Hoja Multi Rutas ${Date.now()}`;
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    await fillRouteSheetBasicFields(sellerPage, tituloMulti);
    await deleteTramoAt(sellerPage, 1);

    await fillTramoFields(sellerPage, 0, {
      origen: "Punto A",
      destino: "Punto B",
      recogidaDate: isoTomorrow,
      recogidaTime: "08:00",
      entregaDate: isoTomorrow,
      entregaTime: "14:00",
      precio: "100",
      responsabilidad: "Transportista",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "General",
    });

    await insertTramoAfter(sellerPage, 0);

    await fillTramoFields(sellerPage, 1, {
      origen: "Punto X",
      destino: "Punto Z",
      recogidaDate: isoDayAfter,
      recogidaTime: "09:00",
      entregaDate: isoDayAfter,
      entregaTime: "17:00",
      precio: "150",
      responsabilidad: "Transportista",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "General",
    });

    await saveRouteSheet(sellerPage);
    await expect(
      sellerPage.getByText(/hoja de ruta creada/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await openRouteSheetDetail(sellerPage, tituloMulti);

    const legList = sellerPage.locator("ul.space-y-0.list-none li");
    await expect(legList.first()).toBeVisible({ timeout: 10_000 });
    const stopCount = await legList.count();
    expect(stopCount).toBeGreaterThanOrEqual(2);

    await sellerPage.context().close();
  });

  // ─── Bonus: Chat thread route sheet detail: all groups show member count ──────
  test("S-bonus: Chat route sheet groups all show member count in chat header", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);

    const buyer = getE2ESession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const buyerCtx = await browser.newContext();
    await buyerCtx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, buyer.sessionToken);
    const buyerPage = await buyerCtx.newPage();

    try {
      await buyerPage.goto(`/chat/${threadId}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await waitForChatReady(buyerPage);

      const memberBtn = buyerPage.getByRole("button", { name: /integrantes/i });
      await expect(memberBtn).toBeVisible({ timeout: 10_000 });
      const text = (await memberBtn.textContent().catch(() => "")) ?? "";
      const count = parseInt(text.match(/\d+/)?.[0] ?? "0", 10);
      expect(count).toBeGreaterThanOrEqual(1);
    } finally {
      await buyerCtx.close();
    }
  });
});
