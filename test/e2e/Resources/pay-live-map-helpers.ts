import type { Browser, BrowserContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { openSellerPage } from "./agreement-ui-helpers";
import { getE2EScenario, getE2ESellerSession, getE2ESession } from "./chat-env";
import { openChatThread, openRailContracts, waitForChatReady } from "./chat-helpers";
import {
  ensureCarrierLegReadyForCede,
  fetchAgreementTitleById,
  fetchRouteSheetStopIds,
  waitForDeliveryOwner,
  waitForDeliveryState,
} from "./e2e-logistics-api";
import {
  logisticsFlowState,
  payAllRoutePathsAsBuyer,
  takeNextAgreementIndex,
  type PaidLogisticsScenario,
} from "./e2e-logistics-env";
import {
  installGeolocationMock,
  pulseGeolocationMock,
  type GeolocationMockCoords,
} from "./chat-geolocation-mock";
import {
  openLogisticsRouteSheet,
  openLiveMapModal,
  expectCedeOwnershipButtonVisible,
  expectCedeOwnershipButtonAbsent,
  expectLiveMapButtonVisible,
  expectLiveMapCarrierPinVisible,
  expectLegEstado,
  startTelemetryRequestSpy,
  type TelemetrySpy,
} from "./route-logistics-ui-helpers";
import {
  acceptPreselInviteAsCarrier,
  isoDayAfter,
  isoDayAfterPlus,
  isoTomorrow,
  resolveRouteSheetIdByTitulo,
} from "./route-sheet-carriers-env";
import {
  clickInviteCarriers,
  clickNewRouteSheet,
  deleteTramoAt,
  dismissPeerPartyExitModalIfOpen,
  ensureRouteSheetDetailOpen,
  fillRouteSheetBasicFields,
  fillTramoFields,
  insertTramoAfter,
  linkRouteSheetToAgreementViaUI,
  openContractByAgreementTitle,
  openRouteSheetDetail,
  openRoutesRail,
  openSubscribersPanel,
  publishRouteSheetViaUI,
  saveRouteSheet,
  searchCarrierPhone,
  sendCarrierInvites,
  waitForRouteSheetForm,
  waitForThreadContractsLoaded,
} from "./route-sheet-ui-helpers";

export type RouteTramoConfig = {
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
  precio: string;
  carrierPhone: string;
  responsabilidad?: string;
  requisitos?: string;
  tipoVehiculo?: string;
  carga?: string;
};

export type FlexibleRouteSetupOpts = {
  tituloPrefix?: string;
  tramos: RouteTramoConfig[];
};

/** Buenos Aires area coords for consecutive / disconnected subroute tests. */
export const E2E_COORDS = {
  t1Origin: { lat: "-34.6037", lng: "-58.3816" },
  t1Dest: { lat: "-34.6100", lng: "-58.3900" },
  t2Dest: { lat: "-34.6200", lng: "-58.4000" },
  /** Disconnected island — origin does not match t1Dest. */
  islandOrigin: { lat: "-34.5500", lng: "-58.3000" },
  islandDest: { lat: "-34.5600", lng: "-58.3100" },
} as const;

function carrierTokenForPhone(phone: string): string {
  const scenario = getE2EScenario()!;
  const normalized = phone.trim();
  if (
    scenario.carrier2Phone?.trim() === normalized &&
    scenario.carrier2SessionToken?.trim()
  ) {
    return scenario.carrier2SessionToken;
  }
  return scenario.carrierSessionToken!;
}

async function newAuthContext(
  browser: Browser,
  sessionToken: string,
): Promise<BrowserContext> {
  const ctx = await browser.newContext();
  await ctx.addInitScript((t: string) => {
    sessionStorage.setItem("vt_session_active", "1");
    sessionStorage.setItem("vt_session_token", t);
  }, sessionToken);
  return ctx;
}

async function confirmCarrierOnTramoViaSubscribers(
  sellerPage: Page,
  tramoIndex: number,
): Promise<void> {
  const panel = sellerPage.getByRole("dialog").filter({
    hasText: /suscriptores/i,
  });
  const tramoBtn = panel
    .getByRole("button", { name: new RegExp(`^tramo ${tramoIndex + 1}\\b`, "i") })
    .first();
  if (await tramoBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await tramoBtn.click();
  }
  const acceptBtn = panel
    .getByRole("button", { name: /aceptar en este tramo/i })
    .first();
  if (await acceptBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await acceptBtn.click();
    const confirmModal = sellerPage
      .getByRole("dialog")
      .filter({ hasText: /confirmar transportista/i });
    await confirmModal
      .getByRole("button", { name: /sí, confirmar/i })
      .click()
      .catch(() => null);
  }
}

/** Creates a multi-tramo route sheet, confirms carriers, links agreement — without paying. */
export async function setupFlexibleRouteScenario(
  browser: Browser,
  opts: FlexibleRouteSetupOpts,
): Promise<PaidLogisticsScenario> {
  const scenario = getE2EScenario()!;
  const seller = getE2ESellerSession()!;
  const threadId = scenario.routeSheetThreadId!;
  const agreementIndex = takeNextAgreementIndex();
  const agreementId =
    scenario.routeSheetAgreementIds?.[agreementIndex] ??
    scenario.routeSheetAgreementId!;
  const titulo = `${opts.tituloPrefix ?? "Hoja Pay Live"} ${Date.now()}`;
  const tramos = opts.tramos;

  const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
  await waitForThreadContractsLoaded(sellerPage);
  const agreementTitle = await fetchAgreementTitleById(
    sellerPage,
    seller.sessionToken,
    threadId,
    agreementId,
  );

  await openRoutesRail(sellerPage);
  await clickNewRouteSheet(sellerPage);
  await waitForRouteSheetForm(sellerPage);
  await fillRouteSheetBasicFields(sellerPage, titulo);
  await deleteTramoAt(sellerPage, 1);
  for (let i = 0; i < tramos.length; i++) {
    if (i > 0) await insertTramoAfter(sellerPage, i - 1);
    const t = tramos[i]!;
    await fillTramoFields(sellerPage, i, {
      origen: t.origen,
      destino: t.destino,
      origenLat: t.origenLat,
      origenLng: t.origenLng,
      destinoLat: t.destinoLat,
      destinoLng: t.destinoLng,
      recogidaDate: t.recogidaDate,
      recogidaTime: t.recogidaTime,
      entregaDate: t.entregaDate,
      entregaTime: t.entregaTime,
      precio: t.precio,
      responsabilidad: t.responsabilidad ?? "Transportista",
      requisitos: t.requisitos ?? "Ninguno",
      tipoVehiculo: t.tipoVehiculo ?? "Camión",
      carga: t.carga ?? "Paquetes",
    });
    await searchCarrierPhone(sellerPage, i, t.carrierPhone);
  }
  await saveRouteSheet(sellerPage);

  await openRailContracts(sellerPage);
  await openContractByAgreementTitle(sellerPage, agreementTitle);
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

  const uniquePhones = [...new Set(tramos.map((t) => t.carrierPhone.trim()))];
  for (const phone of uniquePhones) {
    const token = carrierTokenForPhone(phone);
    const carrierPage = await (await newAuthContext(browser, token)).newPage();
    await acceptPreselInviteAsCarrier(
      carrierPage,
      threadId,
      routeSheetId,
      token,
    );
    await carrierPage.context().close();
  }

  if (tramos.length > 1) {
    await ensureRouteSheetDetailOpen(sellerPage, titulo);
    await openSubscribersPanel(sellerPage);
    for (let i = 0; i < tramos.length; i++) {
      await confirmCarrierOnTramoViaSubscribers(sellerPage, i);
    }
    await sellerPage
      .getByRole("button", { name: /cerrar panel de suscriptores/i })
      .click()
      .catch(() => null);
  }

  const stopIds = await fetchRouteSheetStopIds(
    sellerPage,
    seller.sessionToken,
    threadId,
    routeSheetId,
  );
  await sellerPage.context().close();

  const result: PaidLogisticsScenario = {
    threadId,
    agreementId,
    agreementTitle,
    routeSheetId,
    routeSheetTitulo: titulo,
    stopIds,
  };
  logisticsFlowState.lastScenario = result;
  return result;
}

export type PayWhileCarrierOpenExpectations = {
  /** Tramo index (0-based) where cede must appear for the paying-session carrier. */
  cedeTramoIndex: number;
  /** Tramos where cede must stay hidden for that same carrier session. */
  cedeAbsentTramoIndices?: number[];
  /** Stop id used to wait for ownership after payment. */
  ownerStopId: string;
};

async function ensureCarrierChatThreadReady(
  page: Page,
  threadId: string,
): Promise<void> {
  const tid = threadId.trim();
  if (!page.url().includes(tid)) {
    await openChatThread(page, tid);
  } else {
    await expect(page.getByText(/cargando chat/i)).toBeHidden({
      timeout: 45_000,
    });
  }
  await dismissPeerPartyExitModalIfOpen(page);
  await expect(
    page
      .getByRole("button", { name: /^rutas$|^contratos$|^integrantes$/i })
      .first(),
  ).toBeVisible({ timeout: 30_000 });
}

async function openLogisticsRouteSheetForCarrier(
  page: Page,
  threadId: string,
  routeSheetTitulo: string,
): Promise<void> {
  await ensureCarrierChatThreadReady(page, threadId);
  await openLogisticsRouteSheet(page, routeSheetTitulo);
}

async function nudgeCarrierTelemetryRefresh(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await pulseGeolocationMock(page);
}

/** Wait for a UI telemetry POST after payment (carrier already in chat). */
async function waitForUiCarrierTelemetryAfterPayment(
  page: Page,
  spy: TelemetrySpy,
  scenario: PaidLogisticsScenario,
): Promise<void> {
  const { threadId, routeSheetTitulo } = scenario;
  const aid = encodeURIComponent(scenario.agreementId);

  const pulseCycle = async (): Promise<void> => {
    await nudgeCarrierTelemetryRefresh(page);
    const deliveriesFetch = page
      .waitForResponse(
        (r) =>
          r.request().method() === "GET" &&
          r.url().includes(`/agreements/${aid}/logistics/deliveries`) &&
          r.status() === 200,
        { timeout: 15_000 },
      )
      .catch(() => null);
    await openLogisticsRouteSheetForCarrier(page, threadId, routeSheetTitulo);
    await nudgeCarrierTelemetryRefresh(page);
    await deliveriesFetch;
  };

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline && spy.getCount() < 1) {
    await pulseCycle();
    await page.waitForTimeout(2_000);
  }

  if (spy.getCount() >= 1) return;

  await page.reload({ waitUntil: "domcontentloaded" });
  await ensureCarrierChatThreadReady(page, threadId);
  await openLogisticsRouteSheetForCarrier(page, threadId, routeSheetTitulo);

  const reloadDeadline = Date.now() + 60_000;
  while (Date.now() < reloadDeadline && spy.getCount() < 1) {
    await pulseCycle();
    await page.waitForTimeout(2_000);
  }

  await spy.waitForAtLeast(1, 30_000);
}

async function waitForCarrierLegUiReadyForCede(
  page: Page,
  carrierToken: string,
  scenario: PaidLogisticsScenario,
  tramoIndex: number,
): Promise<void> {
  await ensureCarrierLegReadyForCede(page, carrierToken, scenario, tramoIndex);
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await openChatThread(page, scenario.threadId);
    await openLogisticsRouteSheet(page, scenario.routeSheetTitulo);
    try {
      await expectLegEstado(page, /en tr[aá]nsito/i, tramoIndex);
      return;
    } catch {
      await page.waitForTimeout(2_000);
    }
  }
  throw new Error(
    `Carrier leg ${tramoIndex + 1} UI did not show in_transit within 90s`,
  );
}

/**
 * Carrier stays in chat; buyer pays in parallel; assert live map pin + cede ownership UI.
 */
export async function assertPayWhileCarrierInChatShowsPinAndCede(
  browser: Browser,
  scenario: PaidLogisticsScenario,
  carrierToken: string,
  geo: GeolocationMockCoords,
  expectations: PayWhileCarrierOpenExpectations,
): Promise<void> {
  const buyer = getE2ESession()!;

  const carrierCtx = await browser.newContext();
  await carrierCtx.grantPermissions(["geolocation"]);
  await installGeolocationMock(carrierCtx, geo);
  await carrierCtx.addInitScript((t: string) => {
    sessionStorage.setItem("vt_session_active", "1");
    sessionStorage.setItem("vt_session_token", t);
  }, carrierToken);
  const carrierPage = await carrierCtx.newPage();

  const spy = startTelemetryRequestSpy(carrierPage, {
    agreementId: scenario.agreementId,
    routeSheetId: scenario.routeSheetId,
  });

  await openLogisticsRouteSheetForCarrier(
    carrierPage,
    scenario.threadId,
    scenario.routeSheetTitulo,
  );

  const buyerCtx = await newAuthContext(browser, buyer.sessionToken);
  const buyerPage = await buyerCtx.newPage();
  await openChatThread(buyerPage, scenario.threadId);
  await waitForChatReady(buyerPage);
  await payAllRoutePathsAsBuyer(
    buyerPage,
    scenario.agreementTitle,
    scenario.routeSheetTitulo,
  );
  await buyerCtx.close();

  await waitForDeliveryOwner(
    carrierPage,
    carrierToken,
    scenario.threadId,
    scenario.agreementId,
    expectations.ownerStopId,
    90_000,
  );

  await openChatThread(carrierPage, scenario.threadId);
  await dismissPeerPartyExitModalIfOpen(carrierPage);

  await waitForDeliveryState(
    carrierPage,
    carrierToken,
    scenario.threadId,
    scenario.agreementId,
    expectations.ownerStopId,
    "in_transit",
    20_000,
  ).catch(async () => {
    await ensureCarrierLegReadyForCede(
      carrierPage,
      carrierToken,
      scenario,
      expectations.cedeTramoIndex,
    );
  });

  await waitForUiCarrierTelemetryAfterPayment(carrierPage, spy, scenario);
  spy.dispose();

  await waitForCarrierLegUiReadyForCede(
    carrierPage,
    carrierToken,
    scenario,
    expectations.cedeTramoIndex,
  );

  await expectCedeOwnershipButtonVisible(
    carrierPage,
    expectations.cedeTramoIndex,
  );
  for (const idx of expectations.cedeAbsentTramoIndices ?? []) {
    await expectCedeOwnershipButtonAbsent(carrierPage, idx);
  }

  await expectLiveMapButtonVisible(carrierPage);
  await openLiveMapModal(carrierPage);
  await expectLiveMapCarrierPinVisible(carrierPage);
  await carrierPage
    .getByRole("dialog")
    .filter({ has: carrierPage.locator("#vt-live-route-title") })
    .getByRole("button", { name: /^cerrar$/i })
    .click();

  await carrierCtx.close();
}

export function baseTramoFields(
  overrides: Partial<RouteTramoConfig> & Pick<RouteTramoConfig, "carrierPhone">,
): RouteTramoConfig {
  return {
    origen: "Origen E2E",
    destino: "Destino E2E",
    recogidaDate: isoTomorrow,
    recogidaTime: "09:00",
    entregaDate: isoDayAfter,
    entregaTime: "17:00",
    precio: "150",
    responsabilidad: "Transportista",
    requisitos: "Ninguno",
    tipoVehiculo: "Camión",
    carga: "Paquetes",
    ...overrides,
  };
}

export function consecutiveTramoPair(
  carrierPhone: string,
  sameCarrierOnBoth: boolean,
  carrier2Phone?: string,
): RouteTramoConfig[] {
  const phone2 = sameCarrierOnBoth ? carrierPhone : (carrier2Phone ?? carrierPhone);
  return [
    baseTramoFields({
      origen: "Ciudad A",
      destino: "Ciudad B",
      origenLat: E2E_COORDS.t1Origin.lat,
      origenLng: E2E_COORDS.t1Origin.lng,
      destinoLat: E2E_COORDS.t1Dest.lat,
      destinoLng: E2E_COORDS.t1Dest.lng,
      carrierPhone,
    }),
    baseTramoFields({
      origen: "Ciudad B",
      destino: "Ciudad C",
      origenLat: E2E_COORDS.t1Dest.lat,
      origenLng: E2E_COORDS.t1Dest.lng,
      destinoLat: E2E_COORDS.t2Dest.lat,
      destinoLng: E2E_COORDS.t2Dest.lng,
      recogidaDate: isoDayAfter,
      recogidaTime: "18:00",
      entregaDate: isoDayAfterPlus,
      entregaTime: "20:00",
      precio: "200",
      carrierPhone: phone2,
    }),
  ];
}

export function disconnectedSubroutePair(
  carrier1Phone: string,
  carrier2Phone: string,
): RouteTramoConfig[] {
  return [
    baseTramoFields({
      origen: "Isla A origen",
      destino: "Isla A destino",
      origenLat: E2E_COORDS.t1Origin.lat,
      origenLng: E2E_COORDS.t1Origin.lng,
      destinoLat: E2E_COORDS.t1Dest.lat,
      destinoLng: E2E_COORDS.t1Dest.lng,
      carrierPhone: carrier1Phone,
    }),
    baseTramoFields({
      origen: "Isla B origen",
      destino: "Isla B destino",
      origenLat: E2E_COORDS.islandOrigin.lat,
      origenLng: E2E_COORDS.islandOrigin.lng,
      destinoLat: E2E_COORDS.islandDest.lat,
      destinoLng: E2E_COORDS.islandDest.lng,
      recogidaDate: isoDayAfter,
      recogidaTime: "10:00",
      entregaDate: isoDayAfterPlus,
      entregaTime: "12:00",
      precio: "180",
      carrierPhone: carrier2Phone,
    }),
  ];
}
