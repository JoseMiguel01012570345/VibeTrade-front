import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const FORM_DIALOG_TEXT = /nueva hoja de rutas|editar hoja de rutas/i;

function formDialog(page: Page) {
  return page.locator('[role="dialog"]').filter({ hasText: FORM_DIALOG_TEXT });
}

/**
 * Clicks Contratos tab and waits for at least one accepted agreement to be
 * visible, ensuring the Zustand store has hydrated thread.contracts before
 * any route-sheet create/update operations.
 */
export async function waitForThreadContractsLoaded(page: Page): Promise<void> {
  const contractsTab = page.getByRole("button", { name: /^contratos$/i });
  await expect(contractsTab).toBeVisible({ timeout: 15_000 });
  await contractsTab.click();
  await expect(
    page.getByText(/aceptado|accepted/i).first(),
  ).toBeVisible({ timeout: 15_000 });
}

/** Opens the Rutas tab in the right rail. */
export async function openRoutesRail(page: Page): Promise<void> {
  const tab = page.getByRole("button", { name: /^rutas$/i });
  await expect(tab).toBeVisible({ timeout: 15_000 });
  await tab.click();
}

/** Clicks "Nueva hoja de ruta" button in the rail. */
export async function clickNewRouteSheet(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /nueva hoja de ruta/i });
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();
}

/** Waits for the route sheet form modal to appear. */
export async function waitForRouteSheetForm(page: Page): Promise<void> {
  await expect(formDialog(page)).toBeVisible({ timeout: 15_000 });
}

/** Fills the título and mercancías fields in the open route sheet form. */
export async function fillRouteSheetBasicFields(
  page: Page,
  titulo: string,
  mercancias = "Mercancía E2E de prueba",
  notasGenerales = "Notas E2E de prueba",
): Promise<void> {
  const form = formDialog(page);
  await form.locator("#ruta-titulo").fill(titulo);
  await form.locator("#ruta-merc").fill(mercancias);
  await form.locator("#ruta-notas-g").fill(notasGenerales);
}

/** Parses "HH:MM" and clicks the corresponding hour/minute/AM-PM pills in VtTimeField popover. */
async function pickTimeInPopover(
  page: Page,
  hhmm: string,
): Promise<void> {
  const timePop = page
    .locator('[role="dialog"][aria-label="Elegir hora"]')
    .last();
  await expect(timePop).toBeVisible({ timeout: 5_000 });

  const [hhStr, mmStr] = hhmm.split(":");
  const h24 = parseInt(hhStr ?? "9", 10);
  const mm = parseInt(mmStr ?? "0", 10);
  const ap = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;

  const scrollCols = timePop.locator(".vt-time-scroll");

  const hourPill = scrollCols.nth(0).getByRole("button", {
    name: new RegExp(`^${String(h12).padStart(2, "0")}$`),
  }).first();
  await hourPill.scrollIntoViewIfNeeded();
  await hourPill.click();

  const minPill = scrollCols.nth(1).getByRole("button", {
    name: new RegExp(`^${String(mm).padStart(2, "0")}$`),
  }).first();
  await minPill.scrollIntoViewIfNeeded();
  await minPill.click();

  const apPill = scrollCols.nth(2).getByRole("button", { name: ap }).first();
  await apPill.click();

  await page.keyboard.press("Escape");
  await expect(timePop).toBeHidden({ timeout: 3_000 });
}

/** Opens the map coord picker for a tramo, fills lat/lng, and saves. */
async function fillTramoMapCoords(
  page: Page,
  tramoIndex: number,
  punto: "origen" | "destino",
  lat: string,
  lng: string,
  label?: string,
): Promise<void> {
  const btnName =
    punto === "origen"
      ? /coordenadas origen \(mapa\)/i
      : /coordenadas destino \(mapa\)/i;

  const form = formDialog(page);
  const allMapBtns = form.getByRole("button", { name: btnName });
  const btnCount = await allMapBtns.count();
  const idx = tramoIndex < btnCount ? tramoIndex : btnCount - 1;
  await allMapBtns.nth(idx).click();

  const mapModal = page.locator('[role="dialog"][aria-label="Coordenadas del mapa"]');
  await expect(mapModal).toBeVisible({ timeout: 8_000 });

  if (label) {
    const labelArea = mapModal.locator("textarea").first();
    if (await labelArea.isEditable({ timeout: 1_000 }).catch(() => false)) {
      await labelArea.fill(label);
    }
  }

  const latInput = mapModal.getByLabel("Latitud");
  await latInput.fill(lat);
  const lngInput = mapModal.getByLabel("Longitud");
  await lngInput.fill(lng);

  await mapModal.getByRole("button", { name: /guardar coordenadas/i }).click();
  await expect(mapModal).toBeHidden({ timeout: 5_000 });
}

/** Fills the origin, destination, time and required fields for a tramo (0-indexed). */
export async function fillTramoFields(
  page: Page,
  tramoIndex: number,
  opts: {
    origen: string;
    destino: string;
    origenLat?: string;
    origenLng?: string;
    destinoLat?: string;
    destinoLng?: string;
    recogidaDate: string;
    recogidaTime: string;
    entregaDate: string;
    entregaTime: string;
    precio?: string;
    moneda?: string;
    responsabilidad?: string;
    requisitos?: string;
    tipoVehiculo?: string;
    carga?: string;
    tipoMercanciaCarga?: string;
    tipoMercanciaDescarga?: string;
    notas?: string;
  },
): Promise<void> {
  const i = tramoIndex;
  const form = formDialog(page);

  const origenInput = form.locator(`#ruta-tramo-${i}-origen`);
  if (await origenInput.isEditable({ timeout: 2_000 }).catch(() => false)) {
    await origenInput.fill(opts.origen);
  }
  await form.locator(`#ruta-tramo-${i}-destino`).fill(opts.destino);

  const origenLat = opts.origenLat ?? (i === 0 ? "-34.6037" : undefined);
  const origenLng = opts.origenLng ?? (i === 0 ? "-58.3816" : undefined);
  const destinoLat = opts.destinoLat ?? String(-34.62 - i * 0.01);
  const destinoLng = opts.destinoLng ?? String(-58.4 - i * 0.01);

  if (origenLat !== undefined && origenLng !== undefined) {
    await fillTramoMapCoords(page, i, "origen", origenLat, origenLng, opts.origen);
  }
  await fillTramoMapCoords(page, i, "destino", destinoLat, destinoLng, opts.destino);

  await form
    .getByRole("button", {
      name: new RegExp(`Tramo ${i + 1}: fecha de recogida estimada`, "i"),
    })
    .click();
  const recCal = page.getByRole("dialog", { name: "Calendario" });
  await expect(recCal).toBeVisible({ timeout: 5_000 });
  const recDay = opts.recogidaDate.split("-")[2]?.replace(/^0/, "") ?? "1";
  await recCal
    .locator(".grid-cols-7 button:not([disabled])")
    .filter({ hasText: new RegExp(`^${recDay}$`) })
    .first()
    .click();
  await expect(recCal).toBeHidden({ timeout: 5_000 });

  await form
    .getByRole("button", {
      name: new RegExp(`Tramo ${i + 1}: hora de recogida estimada`, "i"),
    })
    .click();
  await pickTimeInPopover(page, opts.recogidaTime);

  await form
    .getByRole("button", {
      name: new RegExp(`Tramo ${i + 1}: fecha de entrega estimada`, "i"),
    })
    .click();
  const entCal = page.getByRole("dialog", { name: "Calendario" });
  await expect(entCal).toBeVisible({ timeout: 5_000 });
  const entDay = opts.entregaDate.split("-")[2]?.replace(/^0/, "") ?? "2";
  await entCal
    .locator(".grid-cols-7 button:not([disabled])")
    .filter({ hasText: new RegExp(`^${entDay}$`) })
    .first()
    .click();
  await expect(entCal).toBeHidden({ timeout: 5_000 });

  await form
    .getByRole("button", {
      name: new RegExp(`Tramo ${i + 1}: hora de entrega estimada`, "i"),
    })
    .click();
  await pickTimeInPopover(page, opts.entregaTime);

  if (opts.precio !== undefined) {
    await form.locator(`#ruta-tramo-${i}-precio`).fill(opts.precio);
  }

  if (opts.responsabilidad !== undefined) {
    await form.locator(`#ruta-tramo-${i}-resp-emb`).fill(opts.responsabilidad);
  }
  if (opts.requisitos !== undefined) {
    await form.locator(`#ruta-tramo-${i}-req`).fill(opts.requisitos);
  }
  if (opts.tipoVehiculo !== undefined) {
    await form.locator(`#ruta-tramo-${i}-veh`).fill(opts.tipoVehiculo);
  }
  if (opts.carga !== undefined) {
    await form.locator(`#ruta-tramo-${i}-carga`).fill(opts.carga);
  }
  const tipoMercanciaCarga = opts.tipoMercanciaCarga ?? "General";
  await form.locator(`#ruta-tramo-${i}-tmc`).fill(tipoMercanciaCarga);
  const tipoMercanciaDescarga = opts.tipoMercanciaDescarga ?? "General";
  await form.locator(`#ruta-tramo-${i}-tmd`).fill(tipoMercanciaDescarga);
  const notas = opts.notas ?? "Sin observaciones";
  await form.locator(`#ruta-tramo-${i}-notas`).fill(notas);
}

/** Removes the tramo at the given index (0-based) by clicking its "Eliminar tramo" button. */
export async function deleteTramoAt(page: Page, tramoIndex: number): Promise<void> {
  const form = formDialog(page);
  const removeButtons = form.getByRole("button", { name: /eliminar tramo/i });
  await removeButtons.nth(tramoIndex).click();
}

/** Clicks save on the route sheet form modal. */
export async function clickSaveRouteSheetForm(page: Page): Promise<void> {
  const form = formDialog(page);
  await form
    .getByRole("button", { name: /guardar hoja de ruta|guardar cambios/i })
    .click();
}

export async function saveRouteSheet(page: Page): Promise<void> {
  const persistWait = page.waitForResponse(
    (res) =>
      res.request().method() === "PUT" &&
      res.url().includes("/route-sheets/"),
    { timeout: 30_000 },
  );
  await clickSaveRouteSheetForm(page);
  await persistWait.catch(() => null);
  await expect(
    page.getByText(/hoja de ruta creada|hoja de ruta actualizada/i).first(),
  ).toBeVisible({ timeout: 15_000 });
}

/** Opens a route sheet by clicking its title card in the list. */
export async function openRouteSheetDetail(
  page: Page,
  titulo: string,
): Promise<void> {
  await expect(
    page.getByRole("button").filter({ hasText: titulo }).first(),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button").filter({ hasText: titulo }).first().click();
  await expect(page.getByRole("button", { name: /← lista/i })).toBeVisible({
    timeout: 10_000,
  });
}

/** Clicks "Editar" on the route sheet detail toolbar. */
export async function clickEditRouteSheet(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^editar$/i }).click();
  await expect(formDialog(page)).toBeVisible({ timeout: 10_000 });
}

/** Types a phone into the carrier search field of tramo i and clicks Buscar. */
export async function searchCarrierPhone(
  page: Page,
  tramoIndex: number,
  phone: string,
): Promise<void> {
  const form = formDialog(page);
  const phoneInput = form
    .locator(`[data-tramo-phone-index="${tramoIndex}"], input[placeholder*="Buscar transportista"], input[placeholder*="teléfono"]`)
    .first();
  if (await phoneInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await phoneInput.fill(phone);
  }
  const searchBtn = form
    .locator(`[data-tramo-index="${tramoIndex}"]`)
    .getByRole("button", { name: /buscar/i })
    .first();
  if (await searchBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await searchBtn.click();
  }
}

/** Clicks the "Invitar transportista" button in the route sheet detail. */
export async function clickInviteCarriers(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /invitar transportista/i })
    .first()
    .click();
}

/** Adds a tramo by clicking the insert button after tramo at position (0-indexed, inserts after). */
export async function insertTramoAfter(
  page: Page,
  afterIndex: number,
): Promise<void> {
  const form = formDialog(page);
  const insertBtn = form
    .getByRole("button", {
      name: new RegExp(
        `Añadir tramo entre ${afterIndex + 1} y ${afterIndex + 2}|Añadir tramo al final`,
        "i",
      ),
    })
    .first();
  await expect(insertBtn).toBeVisible({ timeout: 5_000 });
  await insertBtn.click();
}

/** If the Contratos panel is showing a contract detail, go back to the list. */
async function ensureContractListView(page: Page): Promise<void> {
  const backBtn = page
    .getByRole("complementary")
    .getByRole("button", { name: /← volver/i });
  if (await backBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await backBtn.click();
    await page.waitForTimeout(300);
  }
}

/**
 * In the Contratos panel list view, clicks the first contract button
 * that does NOT already have a route sheet linked (no "Hoja de ruta (app)" text).
 */
export async function clickFirstUnlinkedContract(page: Page): Promise<void> {
  await ensureContractListView(page);
  const contractBtns = page
    .getByRole("complementary")
    .locator("ul li button");
  const count = await contractBtns.count();
  for (let i = 0; i < count; i++) {
    const btn = contractBtns.nth(i);
    const hasLink = await btn
      .getByText(/hoja de ruta \(app\)/i)
      .isVisible({ timeout: 300 })
      .catch(() => false);
    if (!hasLink) {
      await btn.click();
      return;
    }
  }
  throw new Error("No unlinked contract found in list");
}

/** Opens the contract at the given 0-based index in the Contratos list (stable E2E-RS-AGR-N order). */
export async function openContractByAgreementIndex(
  page: Page,
  index: number,
): Promise<void> {
  await ensureContractListView(page);
  const contractBtns = page
    .getByRole("complementary")
    .locator("ul li button");
  await expect(contractBtns.nth(index)).toBeVisible({ timeout: 10_000 });
  await contractBtns.nth(index).click();
}

/**
 * In the Contratos panel list view, clicks the first contract button
 * that already HAS a route sheet linked ("Hoja de ruta (app)" badge visible).
 * Falls back to clicking the first contract if none found.
 */
export async function clickFirstLinkedContract(page: Page): Promise<void> {
  await ensureContractListView(page);
  const contractBtns = page
    .getByRole("complementary")
    .locator("ul li button");
  const count = await contractBtns.count();
  for (let i = 0; i < count; i++) {
    const btn = contractBtns.nth(i);
    const hasLink = await btn
      .getByText(/hoja de ruta \(app\)/i)
      .isVisible({ timeout: 300 })
      .catch(() => false);
    if (hasLink) {
      await btn.click();
      return;
    }
  }
  await contractBtns.first().click();
}

/** Opens the contract detail whose roadmap is linked to the given route sheet title. */
export async function openContractLinkedToRouteSheet(
  page: Page,
  sheetTitulo: string,
): Promise<void> {
  await ensureContractListView(page);
  const contractBtns = page
    .getByRole("complementary")
    .locator("ul li button");
  const count = await contractBtns.count();
  for (let i = 0; i < count; i++) {
    await contractBtns.nth(i).click();
    const linkedLine = page.getByText(/vinculada ahora a:/i).first();
    const visible = await linkedLine
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (visible) {
      const txt = (await linkedLine.textContent()) ?? "";
      if (txt.includes(sheetTitulo)) return;
    }
    await ensureContractListView(page);
  }
  throw new Error(`No contract linked to route sheet «${sheetTitulo}»`);
}

/** Opens the agreement route-sheet VtSelect (portaled list) and picks an option by title. */
export async function pickRouteSheetInAgreementLinkSelect(
  page: Page,
  sheetTitulo: string,
): Promise<void> {
  const selectBtn = page.getByRole("button", {
    name: /seleccionar hoja de ruta para el acuerdo/i,
  });
  await expect(selectBtn).toBeVisible({ timeout: 8_000 });
  await expect(selectBtn).toBeEnabled({ timeout: 5_000 });
  await selectBtn.click();
  const option = page
    .getByRole("option")
    .filter({ hasText: sheetTitulo })
    .first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  // listPortal: el menú está en body con position:fixed; click() normal falla fuera del viewport.
  await option.evaluate((el) => {
    (el as HTMLButtonElement).click();
  });
  await expect(selectBtn).toContainText(sheetTitulo, { timeout: 5_000 });
}

/**
 * Links a route sheet to an agreement via the Contratos tab UI.
 * Call openRailContracts first; this helper clicks the agreement at contractListIndex
 * (0-based), selects the route sheet, and clicks "Vincular".
 */
export async function linkRouteSheetToAgreementViaUI(
  page: Page,
  sheetTitulo: string,
): Promise<void> {
  await pickRouteSheetInAgreementLinkSelect(page, sheetTitulo);
  const vincularBtn = page.getByRole("button", {
    name: /^vincular$|^actualizar vínculo$/i,
  });
  await expect(vincularBtn).toBeEnabled({ timeout: 5_000 });
  const linkWait = page.waitForResponse(
    (res) =>
      res.request().method() === "PATCH" &&
      res.url().includes("/route-link"),
    { timeout: 20_000 },
  );
  await vincularBtn.click();
  const linkResp = await linkWait.catch(() => null);
  if (linkResp && !linkResp.ok()) {
    const body = await linkResp.text().catch(() => "");
    throw new Error(`Route link failed (${linkResp.status()}): ${body}`);
  }
  await expect(
    page.getByText(/vinculada ahora a:/i).first(),
  ).toContainText(sheetTitulo, { timeout: 15_000 });
}

/**
 * Publishes the currently open route sheet detail to the platform.
 * Handles the native window.confirm() dialog by accepting it.
 */
export async function publishRouteSheetViaUI(page: Page): Promise<void> {
  const publishBtn = page.getByRole("button", {
    name: /publicar en la plataforma/i,
  });
  await expect(publishBtn).toBeVisible({ timeout: 5_000 });
  await expect(publishBtn).toBeEnabled({ timeout: 3_000 });
  page.once("dialog", (d) => void d.accept());
  await publishBtn.click();
  await expect(
    page.getByRole("button", { name: /ocultar de la plataforma/i }),
  ).toBeVisible({ timeout: 15_000 });
}

/** Inserts a tramo at the beginning (before tramo 1). */
export async function insertTramoAtStart(page: Page): Promise<void> {
  const form = formDialog(page);
  const insertBtn = form.getByRole("button", { name: /añadir tramo al inicio/i });
  await expect(insertBtn).toBeVisible({ timeout: 5_000 });
  await insertBtn.click();
}
