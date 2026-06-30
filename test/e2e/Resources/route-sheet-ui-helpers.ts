import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { reloadChatThread, waitForChatReady } from "./chat-helpers";

const FORM_DIALOG_TEXT = /nueva hoja de rutas|editar hoja de rutas/i;

export function formDialog(page: Page) {
  return page.locator('[role="dialog"]').filter({ hasText: FORM_DIALOG_TEXT });
}

async function clickCalendarDay(cal: Locator, day: string): Promise<void> {
  const btn = cal
    .locator(".grid-cols-7 button:not([disabled])")
    .filter({ hasText: new RegExp(`^${day}$`) })
    .first();
  await expect(btn).toBeVisible({ timeout: 5_000 });
  await btn.evaluate((el) => (el as HTMLButtonElement).click());
}

/**
 * Clicks Contratos tab and waits for at least one accepted agreement to be
 * visible, ensuring the Zustand store has hydrated thread.contracts before
 * any route-sheet create/update operations.
 */
export async function dismissPeerPartyExitModalIfOpen(page: Page): Promise<void> {
  const modal = page
    .getByRole("dialog")
    .filter({ hasText: /salida del chat/i });
  const ack = modal.getByRole("button", { name: /^entendido$/i });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await modal.isVisible({ timeout: 500 }).catch(() => false)) {
      await ack.click();
      await expect(modal).toBeHidden({ timeout: 10_000 });
      return;
    }
    await page.waitForTimeout(300);
  }
}

async function ensureChatRailVisible(page: Page): Promise<void> {
  const railTab = page
    .getByRole("button", { name: /^rutas$|^contratos$|^integrantes$/i })
    .first();
  if (await railTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }
  const panelBtn = page.getByRole("button", { name: /^panel$/i });
  if (await panelBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await panelBtn.click();
    await expect(railTab).toBeVisible({ timeout: 15_000 });
  }
}

async function waitForChatRailTabs(page: Page): Promise<void> {
  await ensureChatRailVisible(page);
  await expect(page.getByText(/cargando chat/i)).toBeHidden({ timeout: 45_000 });
  await expect(
    page
      .getByRole("button", { name: /^rutas$|^contratos$|^integrantes$/i })
      .first(),
  ).toBeVisible({ timeout: 30_000 });
}

async function reloadChatThreadIfKnown(page: Page): Promise<void> {
  const threadId = page.url().match(/\/chat\/(cth_[^/?#]+)/)?.[1];
  if (threadId) {
    await reloadChatThread(page);
  } else {
    await page.waitForTimeout(500);
  }
}

export async function waitForThreadContractsLoaded(page: Page): Promise<void> {
  await waitForChatReady(page);
  await dismissPeerPartyExitModalIfOpen(page);

  const contractsTab = page.getByRole("button", { name: /^contratos$/i });

  for (let attempt = 0; attempt < 4; attempt++) {
    await dismissPeerPartyExitModalIfOpen(page);
    await ensureChatRailVisible(page);
    if (await contractsTab.isVisible({ timeout: 8_000 }).catch(() => false)) {
      break;
    }
    if (attempt < 3) {
      await reloadChatThreadIfKnown(page);
      await dismissPeerPartyExitModalIfOpen(page);
      continue;
    }
    await waitForChatRailTabs(page);
    await expect(contractsTab).toBeVisible({ timeout: 15_000 });
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    await dismissPeerPartyExitModalIfOpen(page);
    try {
      await contractsTab.click({ timeout: 8_000 });
      break;
    } catch {
      if (attempt === 4) {
        await reloadChatThreadIfKnown(page);
        await dismissPeerPartyExitModalIfOpen(page);
        await waitForChatRailTabs(page);
        await contractsTab.click({ timeout: 15_000 });
        break;
      }
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }
  }

  await expect(
    page.getByText(/aceptado|accepted/i).first(),
  ).toBeVisible({ timeout: 20_000 });
}

/** Opens the Rutas tab in the right rail. */
export async function closeSubscribersPanelIfOpen(page: Page): Promise<void> {
  const closeBtn = page.getByRole("button", {
    name: /cerrar panel de suscriptores/i,
  });
  if (await closeBtn.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await closeBtn.click();
    await expect(subscribersPanel(page))
      .toBeHidden({ timeout: 8_000 })
      .catch(() => null);
  }
}

/** Opens the Rutas tab in the right rail. */
export async function openRoutesRail(page: Page): Promise<void> {
  await dismissPeerPartyExitModalIfOpen(page);
  await closeSubscribersPanelIfOpen(page);
  await expect(page.getByText(/cargando chat/i)).toBeHidden({ timeout: 45_000 });

  const tab = page.getByRole("button", { name: /^rutas$/i });
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await tab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tab.click();
      break;
    }
    if (attempt === 2) {
      const threadId = page.url().match(/\/chat\/(cth_[^/?#]+)/)?.[1];
      if (threadId) {
        const { openChatThread } = await import("./chat-helpers");
        await openChatThread(page, threadId);
      }
      await expect(tab).toBeVisible({ timeout: 15_000 });
      await tab.click();
      break;
    }
    await dismissPeerPartyExitModalIfOpen(page);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
  const railReady = page
    .getByRole("button", { name: /nueva hoja de ruta/i })
    .or(page.getByText(/\d tramo/))
    .or(page.getByRole("button", { name: /mapa en vivo/i }))
    .or(page.getByText(/^Logística$/i))
    .or(
      page.getByText(
        /Crea una hoja de ruta|La tienda creará y editará la hoja de ruta/i,
      ),
    )
    .first();
  await expect(railReady).toBeVisible({ timeout: 15_000 });
}

/** Clicks "Nueva hoja de ruta" button in the rail. */
export async function clickNewRouteSheet(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const btn = page.getByRole("button", { name: /nueva hoja de ruta/i });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    try {
      await btn.click({ timeout: 8_000 });
      await waitForRouteSheetForm(page);
      return;
    } catch (err) {
      if (attempt === 2) throw err;
      await page.waitForTimeout(400);
    }
  }
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

  const apPill = scrollCols.nth(2).getByRole("button", { name: ap }).first();
  if (await apPill.isEnabled({ timeout: 2_000 }).catch(() => false)) {
    await apPill.click();
  }

  const hourPill = scrollCols
    .nth(0)
    .getByRole("button", {
      name: new RegExp(`^${String(h12).padStart(2, "0")}$`),
      disabled: false,
    })
    .first();
  await hourPill.scrollIntoViewIfNeeded();
  await hourPill.click();

  const minPill = scrollCols
    .nth(1)
    .getByRole("button", {
      name: new RegExp(`^${String(mm).padStart(2, "0")}$`),
      disabled: false,
    })
    .first();
  await minPill.scrollIntoViewIfNeeded();
  await minPill.click();

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

/** Sets lat/lng for origen or destino via the map picker in the route sheet form. */
export async function setTramoMapCoordsViaUI(
  page: Page,
  tramoIndex: number,
  punto: "origen" | "destino",
  lat: string,
  lng: string,
  label?: string,
): Promise<void> {
  await fillTramoMapCoords(page, tramoIndex, punto, lat, lng, label);
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

  if (i === 0 && origenLat !== undefined && origenLng !== undefined) {
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
  await clickCalendarDay(recCal, recDay);
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
  await clickCalendarDay(entCal, entDay);
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

  const moneda = opts.moneda ?? (opts.precio !== undefined ? "USD" : undefined);
  if (moneda !== undefined) {
    const monedaBtn = form.getByRole("button", {
      name: new RegExp(`moneda de pago del tramo ${i + 1}`, "i"),
    });
    if (await monedaBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await monedaBtn.click();
      await page.getByRole("option", { name: moneda }).first().click();
    }
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
  const persistResp = await persistWait.catch(() => null);
  const toast = page.getByText(/hoja de ruta creada|hoja de ruta actualizada/i).first();
  const sawToast = await toast.isVisible({ timeout: 5_000 }).catch(() => false);
  if (sawToast) return;
  await expect(formDialog(page)).toBeHidden({ timeout: 15_000 });
  if (persistResp && !persistResp.ok()) {
    const body = await persistResp.text().catch(() => "");
    throw new Error(`Route sheet save failed (${persistResp.status()}): ${body}`);
  }
}

/** After linking a route sheet in Contratos, opens it in the Rutas panel. */
export async function openLinkedRouteSheetFromContractDetail(
  page: Page,
  tituloFallback?: string,
): Promise<void> {
  const openBtn = page.getByRole("button", {
    name: /ver hoja de ruta en el panel/i,
  });
  const detailReady = page
    .getByRole("button", { name: /← lista/i })
    .or(
      page.getByRole("button", {
        name: /publicar en la plataforma|ocultar de la plataforma/i,
      }),
    )
    .first();
  if (await openBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    for (let attempt = 0; attempt < 3; attempt++) {
      await openBtn.click({ timeout: 5_000 }).catch(() => null);
      if (await detailReady.isVisible({ timeout: 3_000 }).catch(() => false)) {
        return;
      }
      await page.waitForTimeout(400);
    }
  }
  if (tituloFallback?.trim()) {
    await openRouteSheetDetailFromList(page, tituloFallback);
    return;
  }
  await expect(detailReady).toBeVisible({ timeout: 20_000 });
}

async function openRouteSheetDetailFromList(
  page: Page,
  titulo: string,
): Promise<void> {
  await openRoutesRail(page);
  const card = page
    .getByRole("button")
    .filter({ hasText: titulo })
    .filter({ hasText: /\d tramo/i })
    .first();
  const fallback = page.getByRole("button").filter({ hasText: titulo }).first();
  const target =
    (await card.isVisible({ timeout: 5_000 }).catch(() => false)) ? card : fallback;
  await expect(target).toBeVisible({ timeout: 25_000 });
  await target.click();
  await expect(
    page
      .getByRole("button", { name: /← lista/i })
      .or(
        page.getByRole("button", {
          name: /publicar en la plataforma|ocultar de la plataforma/i,
        }),
      )
      .first(),
  ).toBeVisible({ timeout: 20_000 });
}

/** Opens a route sheet by clicking its title card in the list. */
export async function openRouteSheetDetail(
  page: Page,
  titulo: string,
): Promise<void> {
  const fromContract = page.getByRole("button", {
    name: /ver hoja de ruta en el panel/i,
  });
  if (await fromContract.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await openLinkedRouteSheetFromContractDetail(page, titulo);
    return;
  }
  await openRouteSheetDetailFromList(page, titulo);
}

/** Opens route sheet detail unless the seller is already on that view. */
export async function ensureRouteSheetDetailOpen(
  page: Page,
  titulo: string,
): Promise<void> {
  await openRoutesRail(page);
  const onDetail = await page
    .getByRole("button", { name: /← lista/i })
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  if (onDetail) return;
  await openRouteSheetDetail(page, titulo);
}

/** Clicks "Editar" on the route sheet detail toolbar. */
export async function clickEditRouteSheet(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^editar$/i }).click();
  const confirmEdit = page.getByRole("button", { name: /continuar y editar/i });
  if (await confirmEdit.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirmEdit.click();
  }
  await expect(formDialog(page)).toBeVisible({ timeout: 10_000 });
}

/** Types a phone into the carrier search field of tramo i, picks a published service, and confirms. */
export async function searchCarrierPhone(
  page: Page,
  tramoIndex: number,
  phone: string,
): Promise<void> {
  const form = formDialog(page);
  const phoneInput = form.locator(`#ruta-tramo-${tramoIndex}-tel`);
  await expect(phoneInput).toBeVisible({ timeout: 5_000 });
  await phoneInput.fill(phone);
  // Scope to this tramo's row: earlier tramos may already show "Quitar" instead of search.
  await phoneInput
    .locator("xpath=..")
    .getByRole("button", { name: /buscar y elegir/i })
    .click();

  const picker = page.getByRole("dialog", { name: /elegir servicio de transporte/i });
  await expect(picker).toBeVisible({ timeout: 15_000 });
  await expect(picker.getByText(/cargando fichas publicadas/i)).toBeHidden({
    timeout: 20_000,
  });

  const confirmService = picker.getByRole("button", {
    name: /confirmar servicio/i,
  });
  const usePhoneOnly = picker.getByRole("button", {
    name: /usar solo el tel[eé]fono/i,
  });
  if (await confirmService.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await confirmService.click();
  } else {
    await expect(usePhoneOnly).toBeVisible({ timeout: 5_000 });
    await usePhoneOnly.click();
  }

  await expect(
    page
      .getByText(/contacto y servicio guardados|solo el tel[eé]fono del perfil/i)
      .first(),
  ).toBeVisible({ timeout: 10_000 });
}

/** Sends invites for all preselected carriers in the open invite modal. */
export async function sendCarrierInvites(page: Page): Promise<void> {
  const inviteDialog = page
    .getByRole("dialog")
    .filter({ hasText: /invitar transportistas/i });
  await expect(inviteDialog).toBeVisible({ timeout: 10_000 });
  await expect(inviteDialog.getByText(/no hay tramos con un tel[eé]fono/i)).toBeHidden({
    timeout: 10_000,
  });
  const inviteBtn = inviteDialog.getByRole("button", { name: /^invitar$/i });
  await expect(inviteBtn).toBeEnabled({ timeout: 10_000 });
  const notifyWait = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      res.url().includes("/notify-preselected"),
    { timeout: 30_000 },
  );
  await inviteBtn.click();
  const notifyResp = await notifyWait.catch(() => null);
  if (notifyResp?.ok()) {
    await page.keyboard.press("Escape").catch(() => null);
    return;
  }
  await expect(
    page
      .getByText(/se envi[oó].*invitaci[oó]n|invitaci[oó]n enviada|notificaci[oó]n enviada|enviado/i)
      .first(),
  ).toBeVisible({ timeout: 15_000 });
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

/** Opens the contract whose card shows the given agreement title. */
export async function openContractByAgreementTitle(
  page: Page,
  agreementTitle: string,
): Promise<void> {
  await ensureContractListView(page);
  const rail = page.getByRole("complementary");
  const contractBtns = rail.locator("ul li button");
  const count = await contractBtns.count();
  for (let i = 0; i < count; i++) {
    await contractBtns.nth(i).click();
    const titleInDetail = rail
      .getByText(agreementTitle, { exact: true })
      .first();
    if (await titleInDetail.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return;
    }
    await ensureContractListView(page);
  }
  throw new Error(`Contract not found for agreement title «${agreementTitle}»`);
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
  await expect(selectBtn).toBeEnabled({ timeout: 30_000 });
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

/** Asserts a route sheet title is not available in the agreement link selector. */
export async function expectRouteSheetAbsentFromLinkSelect(
  page: Page,
  sheetTitulo: string,
): Promise<void> {
  const selectBtn = page.getByRole("button", {
    name: /seleccionar hoja de ruta para el acuerdo/i,
  });
  await expect(selectBtn).toBeVisible({ timeout: 8_000 });
  await selectBtn.click();
  const option = page.getByRole("option").filter({ hasText: sheetTitulo });
  await expect(option).toHaveCount(0, { timeout: 5_000 });
  await page.keyboard.press("Escape");
}

/** Clicks «Duplicar» on the open contract detail toolbar. Returns duplicated title from API. */
export async function duplicateOpenContractViaUI(page: Page): Promise<string> {
  const dupBtn = page.getByRole("button", { name: /^duplicar$/i });
  await expect(dupBtn).toBeVisible({ timeout: 8_000 });
  const dupWait = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      res.url().includes("/trade-agreements/") &&
      res.url().includes("/duplicate"),
    { timeout: 25_000 },
  );
  await dupBtn.click();
  const dupResp = await dupWait;
  expect(dupResp.ok()).toBeTruthy();
  const body = (await dupResp.json()) as { title?: string };
  return (body.title ?? "").trim();
}

/** Clicks «Duplicar» on the open route sheet detail toolbar. Returns duplicated title from API. */
export async function duplicateOpenRouteSheetViaUI(page: Page): Promise<string> {
  const dupBtn = page.getByRole("button", { name: /^duplicar$/i });
  await expect(dupBtn).toBeVisible({ timeout: 8_000 });
  const dupWait = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      res.url().includes("/route-sheets/") &&
      res.url().includes("/duplicate"),
    { timeout: 25_000 },
  );
  await dupBtn.click();
  const dupResp = await dupWait;
  expect(dupResp.ok()).toBeTruthy();
  const body = (await dupResp.json()) as { titulo?: string };
  return (body.titulo ?? "").trim();
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
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await page.waitForTimeout(1_000 * attempt);
    }
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
    if (linkResp?.ok()) {
      await expect(
        page.getByText(/vinculada ahora a:/i).first(),
      ).toContainText(sheetTitulo, { timeout: 15_000 });
      return;
    }
    const body = linkResp ? await linkResp.text().catch(() => "") : "";
    lastError = new Error(
      `Route link failed (${linkResp?.status() ?? "no response"}): ${body}`,
    );
  }
  throw lastError ?? new Error("Route link failed");
}

/**
 * Publishes the currently open route sheet detail to the platform.
 * Handles the native window.confirm() dialog by accepting it.
 */
export async function publishRouteSheetViaUI(page: Page): Promise<void> {
  const hideBtn = page.getByRole("button", {
    name: /ocultar de la plataforma/i,
  });
  const publishedBadge = page.getByText(/\ben plataforma\b/i).first();
  if (await hideBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }
  if (await publishedBadge.isVisible({ timeout: 1_000 }).catch(() => false)) {
    return;
  }
  const publishBtn = page.getByRole("button", {
    name: /publicar en la plataforma/i,
  });
  await expect(publishBtn).toBeVisible({ timeout: 5_000 });
  await expect(publishBtn).toBeEnabled({ timeout: 3_000 });

  for (let attempt = 0; attempt < 2; attempt++) {
    const persistWait = page.waitForResponse(
      (res) =>
        res.request().method() === "PUT" &&
        res.url().includes("/route-sheets/"),
      { timeout: 45_000 },
    );
    page.once("dialog", (d) => void d.accept());
    await publishBtn.click();
    await persistWait.catch(() => null);
    if (await hideBtn.isVisible({ timeout: 20_000 }).catch(() => false)) {
      return;
    }
    if (await publishedBadge.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return;
    }
  }
  await expect(hideBtn).toBeVisible({ timeout: 15_000 });
}

/** Tras entrega total: republicar desde UI muestra aviso y no persiste publicación. */
export async function expectRepublishBlockedOnDeliveredRouteSheetViaUI(
  page: Page,
  routeSheetTitulo: string,
): Promise<void> {
  await openRoutesRail(page);
  await openRouteSheetDetail(page, routeSheetTitulo);
  const publishBtn = page.getByRole("button", {
    name: /publicar en la plataforma/i,
  });
  await expect(publishBtn).toBeVisible({ timeout: 10_000 });
  await expect(publishBtn).toHaveAttribute(
    "title",
    /ya fue entregada.*no se puede publicar/i,
  );
  await publishBtn.click();
  await expect(
    page.getByText(/ya fue entregada.*no se puede publicar/i).first(),
  ).toBeVisible({ timeout: 10_000 });
}

/** Inserts a tramo at the beginning (before tramo 1). */
export async function insertTramoAtStart(page: Page): Promise<void> {
  const form = formDialog(page);
  const insertBtn = form.getByRole("button", { name: /añadir tramo al inicio/i });
  await expect(insertBtn).toBeVisible({ timeout: 5_000 });
  await insertBtn.click();
}

/** Locator for the embedded Suscriptores aside panel in the routes rail. */
export function subscribersPanel(page: Page) {
  return page.getByRole("complementary", {
    name: /suscriptores a la oferta pública/i,
  });
}

/** Returns to the tramo list inside the subscribers panel when in a detail view. */
async function ensureSubscribersTramoList(
  page: Page,
  routeSheetTitulo?: string,
): Promise<void> {
  const panel = subscribersPanel(page);
  await expect(panel.getByText(/cargando suscripciones/i)).toHaveCount(0, {
    timeout: 20_000,
  });

  const tramoListBtn = panel
    .getByRole("button", { name: /^tramo \d+\b/i })
    .first();

  if (await tramoListBtn.isVisible().catch(() => false)) return;

  for (let i = 0; i < 5; i++) {
    if (await tramoListBtn.isVisible().catch(() => false)) return;
    const backBtn = panel.getByRole("button", { name: /^volver$/i });
    if (!(await backBtn.isVisible().catch(() => false))) break;
    await backBtn.click();
  }
  if (await tramoListBtn.isVisible().catch(() => false)) return;

  const sheetListHint = panel.getByText(/elige una hoja de ruta/i);
  if (await sheetListHint.isVisible().catch(() => false)) {
    let sheetBtn;
    if (routeSheetTitulo?.trim()) {
      sheetBtn = panel
        .getByRole("button")
        .filter({ hasText: routeSheetTitulo.trim() })
        .first();
    } else {
      sheetBtn = panel
        .getByRole("button")
        .filter({ hasText: /[1-9]\d*\s*transportista/i })
        .first();
    }
    await expect(sheetBtn).toBeVisible({ timeout: 10_000 });
    await sheetBtn.click();
  }

  await expect(tramoListBtn).toBeVisible({ timeout: 10_000 });
}

/** Opens a tramo row inside the subscribers panel (1-based tramo number). */
export async function openTramoInSubscribersPanel(
  page: Page,
  tramoNumber: number,
  routeSheetTitulo?: string,
): Promise<void> {
  const panel = subscribersPanel(page);
  await ensureSubscribersTramoList(page, routeSheetTitulo);
  const tramoBtn = panel
    .getByRole("button", { name: new RegExp(`^tramo ${tramoNumber}\\b`, "i") })
    .first();
  await expect(tramoBtn).toBeVisible({ timeout: 10_000 });
  await tramoBtn.click();
}

/** Opens the first tramo row inside the subscribers panel. */
export async function openFirstTramoInSubscribersPanel(
  page: Page,
  routeSheetTitulo?: string,
): Promise<void> {
  await openTramoInSubscribersPanel(page, 1, routeSheetTitulo);
}

/** Selects the first confirmed carrier card in the subscribers panel. */
export async function selectConfirmedCarrierInSubscribersPanel(
  page: Page,
): Promise<void> {
  const panel = subscribersPanel(page);
  const confirmedCarrier = panel
    .getByRole("button")
    .filter({ hasText: /confirmado/i })
    .first();
  await expect(confirmedCarrier).toBeVisible({ timeout: 10_000 });
  await confirmedCarrier.click();
}

/** Opens route sheet detail → suscriptores → tramo → transportista confirmado. */
export async function prepareSubscribersPanelForExpel(
  page: Page,
  tramoIndex: number,
  routeSheetTitulo: string,
): Promise<void> {
  await ensureRouteSheetDetailOpen(page, routeSheetTitulo);
  await openSubscribersPanel(page);
  await openTramoInSubscribersPanel(page, tramoIndex, routeSheetTitulo);
  await selectConfirmedCarrierInSubscribersPanel(page);
}

export function expelFromTramoButton(page: Page) {
  return subscribersPanel(page).getByRole("button", {
    name: /expulsar de este tramo/i,
  });
}

/** Opens the first carrier row for the selected tramo in the subscribers panel. */
export async function openFirstCarrierInSubscribersPanel(page: Page): Promise<void> {
  const panel = subscribersPanel(page);
  const manageBtn = panel
    .getByRole("button", { name: /aceptar en este tramo|rechazar en este tramo|expulsar de este tramo/i })
    .first();
  if (await manageBtn.isVisible().catch(() => false)) return;

  const carrierBtn = panel
    .getByRole("button")
    .filter({ hasText: /confirmado|pendiente|transportista/i })
    .first();
  await expect(carrierBtn).toBeVisible({ timeout: 10_000 });
  await carrierBtn.click();
}

/** Accepts the first pending subscription request in the open subscribers panel. */
export async function acceptFirstSubscriptionRequest(
  page: Page,
  routeSheetTitulo?: string,
): Promise<void> {
  await openFirstTramoInSubscribersPanel(page, routeSheetTitulo);
  await openFirstCarrierInSubscribersPanel(page);
  const panel = subscribersPanel(page);
  const acceptBtn = panel
    .getByRole("button", { name: /aceptar en este tramo/i })
    .first();
  await expect(acceptBtn).toBeVisible({ timeout: 10_000 });
  await acceptBtn.click();
  const confirmModal = page
    .getByRole("dialog")
    .filter({ hasText: /confirmar transportista/i });
  await expect(confirmModal).toBeVisible({ timeout: 5_000 });
  await confirmModal.getByRole("button", { name: /sí, confirmar/i }).click();
  await expect(confirmModal).toBeHidden({ timeout: 10_000 });
  await expect(panel.getByText(/cargando suscripciones/i)).toHaveCount(0, {
    timeout: 20_000,
  });
  await openFirstTramoInSubscribersPanel(page, routeSheetTitulo);
  await openFirstCarrierInSubscribersPanel(page);
  await expect(
    panel.getByRole("button", { name: /expulsar de este tramo/i }).first(),
  ).toBeVisible({ timeout: 15_000 });
}

/** Rejects the first pending subscription request in the open subscribers panel. */
export async function rejectFirstSubscriptionRequest(
  page: Page,
  confirm = true,
  routeSheetTitulo?: string,
): Promise<void> {
  await openFirstTramoInSubscribersPanel(page, routeSheetTitulo);
  await openFirstCarrierInSubscribersPanel(page);
  const panel = subscribersPanel(page);
  const rejectBtn = panel
    .getByRole("button", { name: /rechazar en este tramo/i })
    .first();
  await expect(rejectBtn).toBeVisible({ timeout: 10_000 });
  await rejectBtn.click();
  const confirmModal = page
    .getByRole("dialog")
    .filter({ hasText: /rechazar solicitud/i });
  await expect(confirmModal).toBeVisible({ timeout: 5_000 });
  if (confirm) {
    await confirmModal.getByRole("button", { name: /sí, rechazar/i }).click();
    await expect(confirmModal).toBeHidden({ timeout: 10_000 });
  } else {
    await confirmModal.getByRole("button", { name: /^cancelar$/i }).click();
    await expect(confirmModal).toBeHidden({ timeout: 10_000 });
  }
}

/** Subscribes the current user to the open published route-sheet offer. */
export async function subscribeCarrierToOffer(
  page: Page,
  withServicePicker = true,
): Promise<void> {
  const tramoSection = page.locator("#hoja-suscribir");
  await expect(tramoSection).toBeVisible({ timeout: 15_000 });
  await expect(
    tramoSection.getByText(/suscribirme a un tramo/i),
  ).toBeVisible({ timeout: 10_000 });

  const sendBtn = tramoSection.getByRole("button", {
    name: /enviar solicitud de suscripción/i,
  });
  await expect(sendBtn).toBeEnabled({ timeout: 10_000 });
  await sendBtn.click();

  const serviceModal = page.getByRole("dialog", {
    name: /servicio de transporte/i,
  });
  await expect(serviceModal).toBeVisible({ timeout: 10_000 });

  if (withServicePicker) {
    const confirmBtn = serviceModal.getByRole("button", {
      name: /confirmar solicitud/i,
    });
    await expect(confirmBtn).toBeEnabled({ timeout: 5_000 });
    await confirmBtn.click();
    await expect(serviceModal).toBeHidden({ timeout: 15_000 });
  }
}

/** Opens the Suscriptores panel from the route-sheet detail toolbar. */
export async function openSubscribersPanel(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /^suscriptores$/i });
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await btn.click();
  await expect(subscribersPanel(page)).toBeVisible({ timeout: 10_000 });
}

/** Returns the locator for the section of tramo at 1-based index inside the subscribers panel. */
export function getTramoSubscriberSection(page: Page, tramoIndex: number) {
  return subscribersPanel(page)
    .getByRole("button", { name: new RegExp(`^tramo ${tramoIndex}\\b`, "i") })
    .first();
}

/** Returns a locator for the carrier ficha card inside the subscribers panel (optionally filtered by userId or name). */
export function getCarrierCard(page: Page, carrierIdOrName?: string) {
  const panel = subscribersPanel(page);
  if (carrierIdOrName) {
    return panel.getByText(carrierIdOrName).first();
  }
  return panel.locator("a[href*='/offer/']").first();
}

/** Clicks "Expulsar de este tramo" for a carrier in the subscribers panel. */
export async function kickCarrierFromTramo(
  page: Page,
  tramoIndex?: number,
  routeSheetTitulo?: string,
): Promise<void> {
  const panel = subscribersPanel(page);
  let expelBtn = panel.getByRole("button", { name: /expulsar de este tramo/i }).first();
  if (!(await expelBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
    if (tramoIndex !== undefined) {
      await ensureSubscribersTramoList(page, routeSheetTitulo);
      await panel
        .getByRole("button", { name: new RegExp(`^tramo ${tramoIndex}\\b`, "i") })
        .first()
        .click();
    } else {
      await openFirstTramoInSubscribersPanel(page, routeSheetTitulo);
    }
    const confirmedCarrier = panel
      .getByRole("button")
      .filter({ hasText: /confirmado/i })
      .first();
    if (await confirmedCarrier.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await confirmedCarrier.click();
    } else {
      await openFirstCarrierInSubscribersPanel(page);
    }
    expelBtn = panel.getByRole("button", { name: /expulsar de este tramo/i }).first();
  }
  await expect(expelBtn).toBeVisible({ timeout: 5_000 });
  await expelBtn.click();
  const confirmDialog = page
    .getByRole("dialog")
    .filter({ hasText: /expulsar transportista/i })
    .last();
  await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
  await confirmDialog.locator("#expel-reason-ta").fill("Motivo E2E de expulsión de prueba.");
  await confirmDialog
    .getByRole("button", { name: /confirmar expulsi[oó]n/i })
    .click();
  await expect(confirmDialog).toBeHidden({ timeout: 15_000 });
}

/** Clicks "Expulsar de la operación" for a carrier in the subscribers panel. */
export async function kickCarrierFromOperation(
  page: Page,
  routeSheetTitulo?: string,
): Promise<void> {
  const panel = subscribersPanel(page);
  let expelOpBtn = panel
    .getByRole("button", { name: /expulsar de la operaci[oó]n/i })
    .first();
  if (!(await expelOpBtn.isVisible({ timeout: 2_000 }).catch(() => false))) {
    await openFirstTramoInSubscribersPanel(page, routeSheetTitulo);
    await openFirstCarrierInSubscribersPanel(page);
    expelOpBtn = panel
      .getByRole("button", { name: /expulsar de la operaci[oó]n/i })
      .first();
  }
  await expect(expelOpBtn).toBeVisible({ timeout: 5_000 });
  await expelOpBtn.click();
  const confirmDialog = page
    .getByRole("dialog")
    .filter({ hasText: /expulsar transportista/i })
    .last();
  await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
  await confirmDialog.locator("#expel-reason-ta").fill("Motivo E2E de expulsión de operación.");
  await confirmDialog
    .getByRole("button", { name: /confirmar expulsi[oó]n/i })
    .click();
  await expect(confirmDialog).toBeHidden({ timeout: 15_000 });
}

/**
 * Reads the numeric trust/confianza score from the current page.
 * Returns NaN if not found.
 */
export async function readTrustScore(page: Page): Promise<number> {
  const trustBlock = page.getByLabel(/confianza de la tienda/i).first();
  const trustVisible = await trustBlock.isVisible({ timeout: 5_000 }).catch(() => false);
  if (trustVisible) {
    const txt = (await trustBlock.textContent().catch(() => "")) ?? "";
    const match = txt.match(/(\d+(?:[.,]\d+)?)\s*\/\s*100/);
    if (match?.[1]) return parseFloat(match[1].replace(",", "."));
  }

  const el = page
    .locator("[data-trust-score], [data-confianza]")
    .first();
  const visible = await el.isVisible({ timeout: 3_000 }).catch(() => false);
  if (visible) {
    const attr =
      (await el.getAttribute("data-trust-score").catch(() => null)) ??
      (await el.getAttribute("data-confianza").catch(() => null));
    if (attr !== null) return parseFloat(attr);
    const txt = (await el.textContent().catch(() => "")) ?? "";
    const match = txt.match(/[\d,.]+/);
    if (match) return parseFloat(match[0].replace(",", "."));
  }
  const textEl = page
    .getByText(/confianza|trust/i)
    .locator("xpath=following-sibling::*[1]")
    .first();
  const textVisible = await textEl.isVisible({ timeout: 2_000 }).catch(() => false);
  if (textVisible) {
    const txt = (await textEl.textContent().catch(() => "")) ?? "";
    const match = txt.match(/[\d,.]+/);
    if (match) return parseFloat(match[0].replace(",", "."));
  }
  return NaN;
}

/** Opens the notifications bell panel and waits for the list to finish loading. */
export async function openNotificationsPanel(page: Page): Promise<void> {
  const bell = page.getByRole("button", { name: /abrir notificaciones/i });
  await expect(bell).toBeVisible({ timeout: 15_000 });
  await bell.click();
  const panel = page.getByRole("dialog", { name: /notificaciones/i });
  await expect(panel).toBeVisible({ timeout: 10_000 });
  await expect(
    panel
      .getByText(
        /aún no hay notificaciones|contacto de transporte|hoja de ruta|confianza \d|solicitud|quedó registrada|solicit[oó] el tramo/i,
      )
      .first(),
  ).toBeVisible({ timeout: 20_000 });
}

/** Returns a locator for a notification item containing the given text pattern. */
export function getNotificationItem(page: Page, text: string | RegExp) {
  return page
    .getByRole("dialog", { name: /notificaciones/i })
    .getByText(text)
    .first();
}

/** Closes the notifications panel if open. */
export async function closeNotificationsPanel(page: Page): Promise<void> {
  const panel = page.getByRole("dialog", { name: /notificaciones/i });
  if (await panel.isVisible({ timeout: 1_000 }).catch(() => false)) {
    const closeBtn = panel.getByRole("button", { name: /cerrar/i }).first();
    if (await closeBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await expect(panel).toBeHidden({ timeout: 5_000 });
  }
}

export type RouteTramoSpec = {
  origen: string;
  destino: string;
  recogidaDate: string;
  recogidaTime: string;
  entregaDate: string;
  entregaTime: string;
  precio: string;
  responsabilidad?: string;
  requisitos?: string;
  tipoVehiculo?: string;
  carga?: string;
  origenLat?: string;
  origenLng?: string;
  destinoLat?: string;
  destinoLng?: string;
};

const DEFAULT_TRAMO: Omit<RouteTramoSpec, "origen" | "destino" | "precio"> = {
  recogidaDate: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  recogidaTime: "09:00",
  entregaDate: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
  entregaTime: "17:00",
  responsabilidad: "Vendedor",
  requisitos: "Ninguno",
  tipoVehiculo: "Camión",
  carga: "Paquetes",
};

async function createTwoStopRouteSheet(
  page: Page,
  titulo: string,
  tramo0: RouteTramoSpec,
  tramo1: RouteTramoSpec,
  carrierPhones?: { tramo0?: string; tramo1?: string },
): Promise<void> {
  await waitForThreadContractsLoaded(page);
  await openRoutesRail(page);
  await clickNewRouteSheet(page);
  await waitForRouteSheetForm(page);
  await fillRouteSheetBasicFields(page, titulo);
  await deleteTramoAt(page, 1);
  await fillTramoFields(page, 0, { ...DEFAULT_TRAMO, ...tramo0 });
  if (carrierPhones?.tramo0) {
    await searchCarrierPhone(page, 0, carrierPhones.tramo0);
  }
  await insertTramoAfter(page, 0);
  await fillTramoFields(page, 1, { ...DEFAULT_TRAMO, ...tramo1 });
  if (carrierPhones?.tramo1) {
    await searchCarrierPhone(page, 1, carrierPhones.tramo1);
  }
  await saveRouteSheet(page);
  await expect(page.getByText(/hoja de ruta creada/i).first()).toBeVisible({
    timeout: 15_000,
  });
}

/** Linked A→B, B→C — one payable route path with two stops. */
export async function createLinkedTwoStopRouteSheet(
  page: Page,
  agreementTitle: string,
  carrierPhones?: { tramo0: string; tramo1: string },
): Promise<string> {
  const titulo = `E2E Ruta Enlazada ${Date.now()}`;
  const day = DEFAULT_TRAMO.recogidaDate;
  const linkLat = "-34.6200";
  const linkLng = "-58.4000";
  await createTwoStopRouteSheet(
    page,
    titulo,
    {
      origen: "Ciudad A",
      destino: "Ciudad B",
      recogidaDate: day,
      recogidaTime: "08:00",
      entregaDate: day,
      entregaTime: "12:00",
      destinoLat: linkLat,
      destinoLng: linkLng,
      precio: "10",
    },
    {
      origen: "Ciudad B",
      destino: "Ciudad C",
      origenLat: linkLat,
      origenLng: linkLng,
      destinoLat: "-34.6300",
      destinoLng: "-58.4100",
      recogidaDate: day,
      recogidaTime: "13:00",
      entregaDate: day,
      entregaTime: "18:00",
      precio: "20",
    },
    carrierPhones
      ? { tramo0: carrierPhones.tramo0, tramo1: carrierPhones.tramo1 }
      : undefined,
  );

  const { openRailContracts } = await import("./chat-helpers");
  await openRailContracts(page);
  await page
    .getByRole("button")
    .filter({ hasText: agreementTitle })
    .first()
    .click();
  await linkRouteSheetToAgreementViaUI(page, titulo);
  await openRoutesRail(page);
  await openRouteSheetDetail(page, titulo);
  await publishRouteSheetViaUI(page);
  return titulo;
}

