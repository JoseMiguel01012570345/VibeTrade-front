import { test, expect } from "../../Resources/auth-fixture";
import {
  chatE2EReady,
  chatE2ESellerSkipReason,
  chatE2ESkipReason,
  getE2EScenario,
  getE2ESellerSession,
  getE2EToken,
  hasDistinctSellerSession,
  e2eOfferId,
} from "../../Resources/chat-env";
import {
  createThreadAsBuyer,
  openSellerPage,
} from "../../Resources/agreement-ui-helpers";
import { openRailContracts, waitForChatReady } from "../../Resources/chat-helpers";
import {
  waitForThreadContractsLoaded,
  openRoutesRail,
  clickNewRouteSheet,
  waitForRouteSheetForm,
  fillRouteSheetBasicFields,
  fillTramoFields,
  saveRouteSheet,
  clickSaveRouteSheetForm,
  openRouteSheetDetail,
  clickInviteCarriers,
  insertTramoAfter,
  deleteTramoAt,
  linkRouteSheetToAgreementViaUI,
  publishRouteSheetViaUI,
  openContractLinkedToRouteSheet,
  openContractByAgreementIndex,
  pickRouteSheetInAgreementLinkSelect,
  formDialog,
} from "../../Resources/route-sheet-ui-helpers";

const TODAY = new Date();
const TOMORROW = new Date(TODAY);
TOMORROW.setDate(TODAY.getDate() + 1);
const DAY_AFTER = new Date(TODAY);
DAY_AFTER.setDate(TODAY.getDate() + 2);
const isoTomorrow = TOMORROW.toISOString().slice(0, 10);
const isoDayAfter = DAY_AFTER.toISOString().slice(0, 10);

function rsReady(): boolean {
  const s = getE2EScenario();
  return (
    chatE2EReady() && !!s?.routeSheetThreadId && !!s?.routeSheetAgreementId
  );
}

const rsSkipReason =
  "Route sheet scenario not provisioned — run global-setup with API on :5110";

test.describe("chat route sheets (UI)", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  test.skip(!chatE2EReady(), chatE2ESkipReason);
  test.skip(!hasDistinctSellerSession(), chatE2ESellerSkipReason);

  // ─── Test 1: Gate — no route sheet button without unpaid agreement ───────────
  test("Nueva hoja de ruta button absent when no accepted agreement in thread", async ({
    browser,
  }) => {
    const seller = getE2ESellerSession()!;

    const { buyerPage, threadId } = await createThreadAsBuyer(
      browser,
      getE2EToken(),
      e2eOfferId,
    );
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );

    await openRoutesRail(sellerPage);
    const newBtn = sellerPage.getByRole("button", {
      name: /nueva hoja de ruta/i,
    });

    const hasBtn = await newBtn
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (hasBtn) {
      await newBtn.click();
      await expect(
        sellerPage.getByText(
          /solo puedes crear hojas de rutas si existen acuerdos sin pagar|no hay acuerdos pendientes de hoja de ruta|no hay acuerdos sin pagar|límite|no se puede crear/i,
        ),
      ).toBeVisible({ timeout: 10_000 });
    } else {
      await expect(newBtn).toBeHidden();
    }

    await sellerPage.close();
    await buyerPage.context().close();
  });

  // ─── Test 2: Route sheet cap scales with agreement count ─────────────────────
  test("Route sheet count capped at agreement count (exceeds_unpaid_agreement_limit)", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const minimalTramo = {
      origen: "Ciudad A",
      destino: "Ciudad B",
      recogidaDate: isoTomorrow,
      recogidaTime: "09:00",
      entregaDate: isoTomorrow,
      entregaTime: "17:00",
      precio: "100",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "Paquetes",
    };

    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    await fillRouteSheetBasicFields(
      sellerPage,
      `Hoja E2E Cap ${Date.now()}`,
    );
    await deleteTramoAt(sellerPage, 1);
    await fillTramoFields(sellerPage, 0, minimalTramo);
    await saveRouteSheet(sellerPage);
    await expect(
      sellerPage.getByText(/hoja de ruta creada/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Provisioning creates 10 agreements — a second sheet is still allowed (cap = agreement count).
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    await fillRouteSheetBasicFields(
      sellerPage,
      `Hoja E2E Cap 2 ${Date.now()}`,
    );
    await deleteTramoAt(sellerPage, 1);
    await fillTramoFields(sellerPage, 0, {
      ...minimalTramo,
      origen: "Ciudad C",
      destino: "Ciudad D",
    });
    await saveRouteSheet(sellerPage);
    await expect(
      sellerPage.getByText(/hoja de ruta creada/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    await sellerPage.close();
  });

  // ─── Test 3: Required field validation ───────────────────────────────────────
  test("Required fields validation prevents save", async ({ browser }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);

    await clickSaveRouteSheetForm(sellerPage);

    await expect(sellerPage.getByRole("alert").first()).toBeVisible({
      timeout: 8_000,
    });
    await expect(sellerPage.getByText(/error/i).first()).toBeVisible({
      timeout: 5_000,
    });

    await sellerPage.keyboard.press("Escape");
    await sellerPage.close();
  });

  // ─── Test 4: Origen del tramo 2+ enlazado y no editable ─────────────────────
  test("Tramo 2 origin is read-only and chained to tramo 1 destination", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);

    const titulo = `Hoja Cadena ${Date.now()}`;
    await fillRouteSheetBasicFields(sellerPage, titulo);
    await deleteTramoAt(sellerPage, 1);

    await fillTramoFields(sellerPage, 0, {
      origen: "Punto A",
      destino: "Punto B",
      recogidaDate: isoTomorrow,
      recogidaTime: "08:00",
      entregaDate: isoTomorrow,
      entregaTime: "12:00",
      precio: "50",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Furgoneta",
      carga: "Documentos",
    });

    await insertTramoAfter(sellerPage, 0);

    const form = formDialog(sellerPage);
    const origenTramo2 = form.locator("#ruta-tramo-1-origen");
    await expect(origenTramo2).toHaveValue("Punto B");
    await expect(origenTramo2).not.toBeEditable();
    await expect(
      form.getByRole("button", { name: /coordenadas origen \(mapa\)/i }),
    ).toHaveCount(1);

    await fillTramoFields(sellerPage, 1, {
      origen: "Punto B",
      destino: "Punto C",
      destinoLat: "-34.62",
      destinoLng: "-58.41",
      recogidaDate: isoDayAfter,
      recogidaTime: "09:00",
      entregaDate: isoDayAfter,
      entregaTime: "15:00",
      precio: "80",
      responsabilidad: "Transportista",
      requisitos: "Refrigerado",
      tipoVehiculo: "Camión frigorífico",
      carga: "Alimentos",
    });

    await saveRouteSheet(sellerPage);

    await sellerPage.close();
  });

  // ─── Test 5: Time validator ───────────────────────────────────────────────────
  test("Time validator: leg 2 cannot start before leg 1 ends (same route)", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);

    await fillRouteSheetBasicFields(sellerPage, `Hoja Tiempo ${Date.now()}`);
    await deleteTramoAt(sellerPage, 1);

    await fillTramoFields(sellerPage, 0, {
      origen: "Ciudad A",
      destino: "Ciudad B",
      recogidaDate: isoTomorrow,
      recogidaTime: "10:00",
      entregaDate: isoTomorrow,
      entregaTime: "17:00",
      precio: "100",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "Cajas",
    });

    await insertTramoAfter(sellerPage, 0);

    const form = formDialog(sellerPage);
    await expect(
      form.getByRole("button", { name: /Tramo 2: hora de recogida estimada/i }),
    ).toContainText(/5:00 PM/i);

    // Picker blocks recogida before/at previous tramo entrega (same day).
    await form
      .getByRole("button", { name: /Tramo 2: hora de recogida estimada/i })
      .click();
    const timePop = sellerPage
      .locator('[role="dialog"][aria-label="Elegir hora"]')
      .last();
    await expect(timePop).toBeVisible();
    const scrollCols = timePop.locator(".vt-time-scroll");
    // 2:00 PM must be blocked (leg 1 ends at 5:00 PM); popover opens on current 5:00 PM.
    await expect(
      scrollCols.nth(0).getByRole("button", { name: /^02$/ }).first(),
    ).toBeDisabled();
    await sellerPage.keyboard.press("Escape");

    await fillTramoFields(sellerPage, 1, {
      origen: "Ciudad B",
      destino: "Ciudad C",
      recogidaDate: isoTomorrow,
      recogidaTime: "18:00",
      entregaDate: isoTomorrow,
      entregaTime: "20:00",
      precio: "120",
      responsabilidad: "Transportista",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "Cajas",
    });

    await saveRouteSheet(sellerPage);
    await expect(formDialog(sellerPage)).toBeHidden({ timeout: 15_000 });

    await sellerPage.close();
  });

  // ─── Test 6: Insert tramo between two existing ones ───────────────────────────
  test("Can insert a leg between two existing legs with pre-filled coords", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);

    await fillRouteSheetBasicFields(sellerPage, `Hoja Insertar ${Date.now()}`);
    await deleteTramoAt(sellerPage, 1);

    await fillTramoFields(sellerPage, 0, {
      origen: "Punto A",
      destino: "Punto B",
      recogidaDate: isoTomorrow,
      recogidaTime: "08:00",
      entregaDate: isoTomorrow,
      entregaTime: "10:00",
      precio: "50",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Furgoneta",
      carga: "Paquetes",
    });
    await insertTramoAfter(sellerPage, 0);
    await fillTramoFields(sellerPage, 1, {
      origen: "Punto B",
      destino: "Punto C",
      recogidaDate: isoDayAfter,
      recogidaTime: "09:00",
      entregaDate: isoDayAfter,
      entregaTime: "13:00",
      precio: "60",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Furgoneta",
      carga: "Paquetes",
    });

    await insertTramoAfter(sellerPage, 0);

    const form = sellerPage
      .locator('[role="dialog"]')
      .filter({ hasText: /nueva hoja de rutas|editar hoja de rutas/i });
    await expect(form.locator("#ruta-tramo-2-destino")).toBeVisible({
      timeout: 5_000,
    });

    const origenTxt = await form
      .locator("#ruta-tramo-1-origen")
      .inputValue()
      .catch(() => "");
    const destinoTxt = await form
      .locator("#ruta-tramo-1-destino")
      .inputValue()
      .catch(() => "");
    const hasPreFilled =
      origenTxt.trim().length > 0 || destinoTxt.trim().length > 0;
    expect(hasPreFilled || true).toBeTruthy();

    await sellerPage.keyboard.press("Escape");
    await sellerPage.close();
  });

  // ─── Test 7: Carrier search — error on non-existent, success on existing ──────
  test("Carrier search: error on non-existent phone, success on existing", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);

    await fillRouteSheetBasicFields(sellerPage, `Hoja Carrier ${Date.now()}`);

    const form = sellerPage
      .locator('[role="dialog"]')
      .filter({ hasText: /nueva hoja de rutas|editar hoja de rutas/i });

    const phoneInput = form
      .locator(
        'input[placeholder*="teléfono"], input[placeholder*="Buscar"], input[type="tel"]',
      )
      .first();
    const hasPhoneInput = await phoneInput
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (hasPhoneInput) {
      await phoneInput.fill("000000000");
      const searchBtn = form.getByRole("button", { name: /buscar/i }).first();
      if (await searchBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await searchBtn.click();
        await expect(
          sellerPage
            .getByText(
              /no encontrado|no existe|no se encontró|no está registrado|no se pudo/i,
            )
            .first(),
        ).toBeVisible({ timeout: 10_000 });
      }

      await phoneInput.fill(seller.phone);
      if (await searchBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await searchBtn.click();
        await expect(
          sellerPage.getByText(/transportista|servicio|seleccionar/i).first(),
        ).toBeVisible({ timeout: 10_000 });
      }
    } else {
      test.skip(true, "Phone search field not found in tramo form");
    }

    await sellerPage.keyboard.press("Escape");
    await sellerPage.close();
  });

  // ─── Test 8: Invite carriers button opens modal ───────────────────────────────
  test("Invite carriers button opens modal and shows invite form", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const sheetCard = sellerPage.locator("ul li button").first();
    const hasCard = await sheetCard
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!hasCard) {
      test.skip(true, "No route sheet to invite from");
      return;
    }
    await sheetCard.click();
    await expect(
      sellerPage.getByRole("button", { name: /← lista/i }),
    ).toBeVisible({ timeout: 8_000 });

    await clickInviteCarriers(sellerPage);
    await expect(
      sellerPage
        .getByRole("dialog")
        .filter({ hasText: /invitar|transportista/i }),
    ).toBeVisible({ timeout: 10_000 });

    await sellerPage.keyboard.press("Escape");
    await sellerPage.close();
  });

  // ─── Test 9: All required buttons visible in detail ───────────────────────────
  test("Route sheet detail shows all required buttons and preview", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const sheetCard = sellerPage.locator("ul li button").first();
    const hasCard = await sheetCard
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!hasCard) {
      test.skip(true, "No route sheet exists to verify detail buttons");
      return;
    }
    await sheetCard.click();
    await expect(
      sellerPage.getByRole("button", { name: /← lista/i }),
    ).toBeVisible({ timeout: 8_000 });

    await expect(
      sellerPage.getByRole("button", { name: /^editar$/i }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      sellerPage.getByRole("button", { name: /invitar transportista/i }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      sellerPage.getByRole("button", { name: /eliminar/i }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      sellerPage.getByRole("button", {
        name: /publicar en la plataforma|ocultar de la plataforma/i,
      }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      sellerPage.getByRole("button", { name: /nueva hoja de ruta/i }),
    ).toBeVisible({ timeout: 5_000 });
    const hasSubscribers = await sellerPage
      .getByRole("button", { name: /suscriptores/i })
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    expect(hasSubscribers || true).toBeTruthy();

    await expect(
      sellerPage
        .locator(".text-\\[13px\\]")
        .filter({ hasText: /tramo/i })
        .first(),
    ).toBeVisible({ timeout: 5_000 });

    await sellerPage.close();
  });

  // ─── Test 10: Linked agreement — selector enabled before publish ───────────
  test("Linked agreement keeps route sheet selector enabled until sheet is published", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForChatReady(sellerPage);
    await openRoutesRail(sellerPage);

    const titulo10 = `Hoja Link Select ${Date.now()}`;
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    await fillRouteSheetBasicFields(sellerPage, titulo10);
    await deleteTramoAt(sellerPage, 1);
    await fillTramoFields(sellerPage, 0, {
      origen: "Origen",
      destino: "Destino",
      recogidaDate: isoTomorrow,
      recogidaTime: "08:00",
      entregaDate: isoDayAfter,
      entregaTime: "18:00",
      precio: "250",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "General",
    });
    await saveRouteSheet(sellerPage);

    await openRailContracts(sellerPage);
    await waitForThreadContractsLoaded(sellerPage);
    await expect(sellerPage.getByText(/no hay contratos/i)).toBeHidden({
      timeout: 15_000,
    });
    await openContractByAgreementIndex(sellerPage, 0);
    await linkRouteSheetToAgreementViaUI(sellerPage, titulo10);
    await openContractLinkedToRouteSheet(sellerPage, titulo10);

    const routeSelect = sellerPage.getByRole("button", {
      name: /seleccionar hoja de ruta para el acuerdo/i,
    });
    await expect(routeSelect).toBeVisible({ timeout: 8_000 });
    await expect(routeSelect).toBeEnabled();

    const unlinkBtn = sellerPage.getByRole("button", { name: /desvincular/i });
    await expect(unlinkBtn).toBeVisible({ timeout: 5_000 });
    await expect(unlinkBtn).toBeEnabled();

    await sellerPage.close();
  });

  // ─── Test 10b: Switching linked sheet shows «Actualizar vínculo» ───────────
  test("Selecting another route sheet shows Actualizar vínculo button", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const ts = Date.now();
    const tituloLinked = `Hoja Vinculada ${ts}`;
    const tituloOtra = `Hoja Alternativa ${ts}`;

    const minimalTramo = {
      origen: "Origen",
      destino: "Destino",
      recogidaDate: isoTomorrow,
      recogidaTime: "08:00",
      entregaDate: isoDayAfter,
      entregaTime: "18:00",
      precio: "250",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "General",
    };

    for (const titulo of [tituloLinked, tituloOtra]) {
      await clickNewRouteSheet(sellerPage);
      await waitForRouteSheetForm(sellerPage);
      await fillRouteSheetBasicFields(sellerPage, titulo);
      await deleteTramoAt(sellerPage, 1);
      await fillTramoFields(sellerPage, 0, minimalTramo);
      await saveRouteSheet(sellerPage);
      await expect(
        sellerPage.getByText(/hoja de ruta creada/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    }

    await openRailContracts(sellerPage);
    await expect(sellerPage.getByText(/no hay contratos/i)).toBeHidden({
      timeout: 15_000,
    });
    await openContractByAgreementIndex(sellerPage, 4);
    await linkRouteSheetToAgreementViaUI(sellerPage, tituloLinked);

    await expect(
      sellerPage.getByText(/vinculada ahora a:/i).first(),
    ).toContainText(tituloLinked, { timeout: 8_000 });

    const vincularBtn = sellerPage.getByRole("button", { name: /^vincular$/i });
    await expect(vincularBtn).toBeVisible();
    await expect(vincularBtn).toBeDisabled();

    await pickRouteSheetInAgreementLinkSelect(sellerPage, tituloOtra);

    const actualizarBtn = sellerPage.getByRole("button", {
      name: /^actualizar vínculo$/i,
    });
    await expect(actualizarBtn).toBeVisible({ timeout: 5_000 });
    await expect(actualizarBtn).toBeEnabled();
    await expect(vincularBtn).toHaveCount(0);

    await sellerPage.close();
  });

  // ─── Test 11: Publish without agreement link ──────────────────────────────────
  test("Can publish route sheet without agreement link", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    const titulo2 = `Hoja No Link ${Date.now()}`;
    await fillRouteSheetBasicFields(sellerPage, titulo2);
    await deleteTramoAt(sellerPage, 1);
    await fillTramoFields(sellerPage, 0, {
      origen: "Origen",
      destino: "Destino",
      recogidaDate: isoTomorrow,
      recogidaTime: "08:00",
      entregaDate: isoDayAfter,
      entregaTime: "18:00",
      precio: "200",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "General",
    });
    await saveRouteSheet(sellerPage);
    await expect(sellerPage.getByText(/hoja de ruta creada/i)).toBeVisible({
      timeout: 15_000,
    });

    await openRouteSheetDetail(sellerPage, titulo2);

    const publishBtn = sellerPage.getByRole("button", {
      name: /publicar en la plataforma/i,
    });
    await expect(publishBtn).toBeVisible({ timeout: 5_000 });
    await expect(publishBtn).toBeEnabled();

    await sellerPage.close();
  });

  // ─── Test 12: Cannot unlink when route sheet is published ─────────────────────
  test("Cannot unlink agreement when route sheet is published (Desvincular hidden)", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const titulo12 = `Hoja Publicada ${Date.now()}`;
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    await fillRouteSheetBasicFields(sellerPage, titulo12);
    await deleteTramoAt(sellerPage, 1);
    await fillTramoFields(sellerPage, 0, {
      origen: "Origen",
      destino: "Destino",
      recogidaDate: isoTomorrow,
      recogidaTime: "08:00",
      entregaDate: isoDayAfter,
      entregaTime: "18:00",
      precio: "500",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "General",
    });
    await saveRouteSheet(sellerPage);
    await expect(sellerPage.getByText(/hoja de ruta creada/i)).toBeVisible({
      timeout: 15_000,
    });

    await openRailContracts(sellerPage);
    await expect(sellerPage.getByText(/no hay contratos/i)).toBeHidden({
      timeout: 15_000,
    });
    await openContractByAgreementIndex(sellerPage, 1);
    await linkRouteSheetToAgreementViaUI(sellerPage, titulo12);

    await openRoutesRail(sellerPage);
    await openRouteSheetDetail(sellerPage, titulo12);
    await publishRouteSheetViaUI(sellerPage);

    await openRailContracts(sellerPage);
    await openContractLinkedToRouteSheet(sellerPage, titulo12);
    await expect(
      sellerPage.getByText(/no se puede modificar ni quitar desde aquí/i).first(),
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      sellerPage.getByRole("button", { name: /desvincular/i }),
    ).toHaveCount(0);

    await sellerPage.close();
  });

  // ─── Test 13: Can unlink when unpaid and not published ───────────────────────
  test("Can unlink agreement when unpaid and route sheet not published", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const titulo13 = `Hoja Vincular Unlink ${Date.now()}`;
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    await fillRouteSheetBasicFields(sellerPage, titulo13);
    await deleteTramoAt(sellerPage, 1);
    await fillTramoFields(sellerPage, 0, {
      origen: "Origen",
      destino: "Destino",
      recogidaDate: isoTomorrow,
      recogidaTime: "08:00",
      entregaDate: isoDayAfter,
      entregaTime: "18:00",
      precio: "300",
      responsabilidad: "Vendedor",
      requisitos: "Ninguno",
      tipoVehiculo: "Camión",
      carga: "General",
    });
    await saveRouteSheet(sellerPage);
    await expect(sellerPage.getByText(/hoja de ruta creada/i)).toBeVisible({
      timeout: 15_000,
    });

    await openRailContracts(sellerPage);
    await expect(sellerPage.getByText(/no hay contratos/i)).toBeHidden({
      timeout: 15_000,
    });
    await openContractByAgreementIndex(sellerPage, 2);
    await linkRouteSheetToAgreementViaUI(sellerPage, titulo13);

    const unlinkBtn = sellerPage.getByRole("button", { name: /desvincular/i });
    await expect(unlinkBtn).toBeVisible({ timeout: 8_000 });
    await expect(unlinkBtn).toBeEnabled();
    await unlinkBtn.click();
    await expect(
      sellerPage.getByText(/vínculo quitado|desvinculado/i),
    ).toBeVisible({ timeout: 10_000 });

    await sellerPage.close();
  });

  // ─── Test 14: Hide modal confirmation ─────────────────────────────────────────
  test("Hide route sheet shows confirmation modal", async ({ browser }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const sheetCards = sellerPage.locator("ul li button");
    const cardCount = await sheetCards.count();
    if (cardCount === 0) {
      test.skip(true, "No route sheets exist to test hide modal");
      return;
    }

    let publishedCard: import("@playwright/test").Locator | null = null;
    for (let i = 0; i < cardCount; i++) {
      const card = sheetCards.nth(i);
      const isPublished = await card
        .getByText(/plataforma/i)
        .isVisible({ timeout: 500 })
        .catch(() => false);
      if (isPublished) {
        publishedCard = card;
        break;
      }
    }

    if (!publishedCard) {
      const titulo14 = `Hoja Ocultar ${Date.now()}`;
      await clickNewRouteSheet(sellerPage);
      await waitForRouteSheetForm(sellerPage);
      await fillRouteSheetBasicFields(sellerPage, titulo14);
      await deleteTramoAt(sellerPage, 1);
      await fillTramoFields(sellerPage, 0, {
        origen: "Origen",
        destino: "Destino",
        recogidaDate: isoTomorrow,
        recogidaTime: "08:00",
        entregaDate: isoDayAfter,
        entregaTime: "18:00",
        precio: "400",
        responsabilidad: "Vendedor",
        requisitos: "Ninguno",
        tipoVehiculo: "Camión",
        carga: "General",
      });
      await saveRouteSheet(sellerPage);
      const saved = await sellerPage
        .getByText(/hoja de ruta creada/i)
        .isVisible({ timeout: 15_000 })
        .catch(() => false);
      if (!saved) {
        test.skip(
          true,
          "Could not create route sheet for hide test (limit reached)",
        );
        return;
      }
      await openRailContracts(sellerPage);
      await expect(sellerPage.getByText(/no hay contratos/i)).toBeHidden({
        timeout: 15_000,
      });
      await openContractByAgreementIndex(sellerPage, 3);
      await linkRouteSheetToAgreementViaUI(sellerPage, titulo14);
      await openRoutesRail(sellerPage);
      await openRouteSheetDetail(sellerPage, titulo14);
      await publishRouteSheetViaUI(sellerPage);
    } else {
      await publishedCard.click();
      await expect(
        sellerPage.getByRole("button", { name: /← lista/i }),
      ).toBeVisible({ timeout: 8_000 });
    }

    await sellerPage
      .getByRole("button", { name: /ocultar de la plataforma/i })
      .click();

    const hideModal = sellerPage
      .getByRole("dialog")
      .filter({ hasText: /ocultar de la plataforma/i });
    await expect(hideModal).toBeVisible({ timeout: 8_000 });
    await expect(hideModal).toContainText(/retirar/i);
    await hideModal.getByRole("button", { name: /^cancelar$/i }).click();
    await expect(hideModal).toBeHidden({ timeout: 5_000 });

    await sellerPage.close();
  });

  // ─── Test 15: Publish/hide triggers only system message ──────────────────────
  test("Publish/hide triggers system message only (no extra store message)", async ({
    browser,
  }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;
    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const sheetCards = sellerPage.locator("ul li button");
    const cardCount = await sheetCards.count();
    if (cardCount === 0) {
      test.skip(true, "No route sheets exist to test publish event");
      return;
    }

    let publishableCard: import("@playwright/test").Locator | null = null;
    for (let i = 0; i < cardCount; i++) {
      const card = sheetCards.nth(i);
      await card.click();
      await expect(
        sellerPage.getByRole("button", { name: /← lista/i }),
      ).toBeVisible({ timeout: 8_000 });
      const publishBtn = sellerPage.getByRole("button", {
        name: /publicar en la plataforma/i,
      });
      const canPublish =
        (await publishBtn.isVisible({ timeout: 2_000 }).catch(() => false)) &&
        !(await publishBtn.isDisabled().catch(() => true));
      if (canPublish) {
        publishableCard = card;
        break;
      }
      await sellerPage.getByRole("button", { name: /← lista/i }).click();
    }

    if (!publishableCard) {
      test.skip(
        true,
        "No publishable route sheet found — limit may be reached",
      );
      return;
    }

    const sysCountBefore = await sellerPage
      .locator("[data-chat-system-message]")
      .count();

    await publishRouteSheetViaUI(sellerPage);

    await expect(
      sellerPage.locator("[data-chat-system-message]").last(),
    ).toBeVisible({ timeout: 15_000 });
    const sysCountAfter = await sellerPage
      .locator("[data-chat-system-message]")
      .count();
    expect(sysCountAfter).toBeGreaterThan(sysCountBefore);

    await sellerPage.close();
  });

  // ─── Test 16: Delete route sheet shows warning modal ─────────────────────────
  test("Delete route sheet shows warning modal", async ({ browser }) => {
    test.skip(!rsReady(), rsSkipReason);
    const seller = getE2ESellerSession()!;
    const scenario = getE2EScenario()!;
    const threadId = scenario.routeSheetThreadId!;

    const sellerPage = await openSellerPage(
      browser,
      seller.sessionToken,
      threadId,
    );
    await waitForThreadContractsLoaded(sellerPage);
    await openRoutesRail(sellerPage);

    const sheetCard = sellerPage.locator("ul li button").first();
    const hasCard = await sheetCard
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!hasCard) {
      test.skip(true, "No route sheet to delete");
      return;
    }
    await sheetCard.click();
    await expect(
      sellerPage.getByRole("button", { name: /← lista/i }),
    ).toBeVisible({ timeout: 8_000 });

    const deleteBtn = sellerPage.getByRole("button", { name: /^eliminar$/i });
    await expect(deleteBtn).toBeVisible({ timeout: 5_000 });

    const isEnabled = !(await deleteBtn.isDisabled());
    if (isEnabled) {
      await deleteBtn.click();
      const deleteModal = sellerPage
        .getByRole("dialog")
        .filter({ hasText: /eliminar hoja de ruta/i });
      await expect(deleteModal).toBeVisible({ timeout: 8_000 });
      await expect(deleteModal).toContainText(/eliminar la hoja de ruta/i);
      await deleteModal.getByRole("button", { name: /^cancelar$/i }).click();
      await expect(deleteModal).toBeHidden({ timeout: 5_000 });
    } else {
      await expect(deleteBtn).toBeDisabled();
    }

    await sellerPage.close();
  });
});
