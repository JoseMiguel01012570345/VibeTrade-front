import fs from "node:fs";
import type { Browser, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { openSellerPage } from "./agreement-ui-helpers";
import { getE2EScenario, getE2ESellerSession, getE2ESession } from "./chat-env";
import { e2eScenarioFile } from "./e2e-paths";
import type { E2EChatScenario } from "./e2e-chat-scenario";
import { openChatThread, openRailContracts, reloadChatThread, waitForChatReady } from "./chat-helpers";
import {
  ensureCarrierConfirmedOnSheetStops,
  fetchAgreementTitleById,
  fetchRouteSheetStopIds,
  payRouteStopsViaBuyerApi,
  postCarrierTelemetryApi,
  waitForDeliveryState,
  waitForDeliveryOwner,
} from "./e2e-logistics-api";
import {
  clickPayCurrency,
  confirmInformeCheckbox,
  ensureBuyerDemoCard,
  prepareBuyerRouteCheckout,
  selectAllRoutePathsForPayment,
  waitForInformeReady,
} from "./payment-checkout-ui-helpers";
import {
  ensureRouteSheetDetailOpen,
  clickNewRouteSheet,
  deleteTramoAt,
  fillRouteSheetBasicFields,
  fillTramoFields,
  insertTramoAfter,
  linkRouteSheetToAgreementViaUI,
  openContractByAgreementTitle,
  openRouteSheetDetail,
  openRoutesRail,
  openSubscribersPanel,
  publishRouteSheetViaUI,
  clickInviteCarriers,
  sendCarrierInvites,
  saveRouteSheet,
  searchCarrierPhone,
  waitForRouteSheetForm,
  waitForThreadContractsLoaded,
  closeSubscribersPanelIfOpen,
  dismissPeerPartyExitModalIfOpen,
  openTramoInSubscribersPanel,
  openFirstCarrierInSubscribersPanel,
  subscribersPanel,
} from "./route-sheet-ui-helpers";
import {
  acceptPreselInviteAsCarrier,
  setupRouteSheetWithCarrier,
  TRAMO_OPTS,
  TRAMO_OPTS_2,
  resolveRouteSheetIdByTitulo,
} from "./route-sheet-carriers-env";

export type PaidLogisticsScenario = {
  threadId: string;
  agreementId: string;
  agreementTitle: string;
  routeSheetId: string;
  routeSheetTitulo: string;
  stopIds: string[];
};

export const logisticsFlowState: {
  lastScenario: PaidLogisticsScenario | null;
} = { lastScenario: null };

/** Monotonic allocator persisted in e2e-scenario.json across Playwright worker restarts. */
function readLogisticsAgreementCursor(): number {
  if (!fs.existsSync(e2eScenarioFile)) return 0;
  try {
    const raw = JSON.parse(
      fs.readFileSync(e2eScenarioFile, "utf8"),
    ) as E2EChatScenario;
    return raw.logisticsAgreementCursor ?? 0;
  } catch {
    return 0;
  }
}

function writeLogisticsAgreementCursor(next: number): void {
  if (!fs.existsSync(e2eScenarioFile)) return;
  const raw = JSON.parse(
    fs.readFileSync(e2eScenarioFile, "utf8"),
  ) as E2EChatScenario;
  raw.logisticsAgreementCursor = next;
  fs.writeFileSync(e2eScenarioFile, JSON.stringify(raw, null, 2), "utf8");
}

export function takeNextAgreementIndex(): number {
  const max = getE2EScenario()?.routeSheetAgreementIds?.length ?? 10;
  const index = readLogisticsAgreementCursor();
  if (index >= max) {
    throw new Error(
      `E2E logistics exhausted ${max} pre-provisioned agreements — reduce reuse or add more in global-setup`,
    );
  }
  writeLogisticsAgreementCursor(index + 1);
  return index;
}

export function hasCarrier2Session(): boolean {
  const s = getE2EScenario();
  return !!s?.carrier2SessionToken && !!s?.carrier2Phone;
}

function carrierSessionTokenForPhone(
  scenario: E2EChatScenario,
  phone: string,
): string {
  const normalized = phone.trim();
  if (
    scenario.carrier2Phone?.trim() === normalized &&
    scenario.carrier2SessionToken?.trim()
  ) {
    return scenario.carrier2SessionToken;
  }
  return scenario.carrierSessionToken!;
}

export async function newAuthenticatedPage(
  browser: Browser,
  sessionToken: string,
): Promise<Page> {
  const ctx = await browser.newContext();
  await ctx.addInitScript((t: string) => {
    sessionStorage.setItem("vt_session_active", "1");
    sessionStorage.setItem("vt_session_token", t);
  }, sessionToken);
  return ctx.newPage();
}

export async function openCarrierPage(
  browser: Browser,
  sessionToken: string,
  threadId: string,
): Promise<Page> {
  const page = await newAuthenticatedPage(browser, sessionToken);
  await page.goto(`/chat/${threadId}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await expect(page.getByText(/cargando chat/i)).toBeHidden({
    timeout: 45_000,
  });
  await expect(
    page
      .getByRole("button", { name: /^rutas$|^contratos$|^integrantes$/i })
      .first(),
  ).toBeVisible({ timeout: 30_000 });
  await dismissPeerPartyExitModalIfOpen(page);
  return page;
}

export async function payAllRoutePathsAsBuyer(
  page: Page,
  agreementTitle: string,
  routeSheetTitulo: string,
): Promise<void> {
  await ensureBuyerDemoCard(page);
  await prepareBuyerRouteCheckout(page, agreementTitle, routeSheetTitulo);
  await selectAllRoutePathsForPayment(page);
  await waitForInformeReady(page);
  await confirmInformeCheckbox(page);
  await clickPayCurrency(page, "USD");
  await expect(
    page
      .getByText(
        /pago exitoso|pagos completados|todo cobrado|recibo de pago|cobros listos en todas las monedas/i,
      )
      .first(),
  ).toBeVisible({ timeout: 60_000 });
}

export type SetupPaidRouteOpts = {
  tituloPrefix?: string;
  tramoCount?: 1 | 2;
  carrierPhone?: string;
  carrier2Phone?: string;
  agreementIndex?: number;
  /** Override global RS thread (e.g. isolated exit-policy scenario). */
  threadId?: string;
  agreementId?: string;
  publish?: boolean;
  payRoutes?: boolean;
  /** Omit agreement ↔ route sheet link (e.g. pay merch first, link later). */
  skipLink?: boolean;
  /** Use when the buyer was party-soft-expelled and cannot open the chat UI to pay. */
  payRoutesViaBuyerApi?: boolean;
};

/** Creates route sheet, links agreement, publishes, confirms carrier, optionally pays. */
export async function setupPaidRouteLogisticsScenario(
  browser: Browser,
  opts: SetupPaidRouteOpts = {},
): Promise<PaidLogisticsScenario> {
  const scenario = getE2EScenario()!;
  const seller = getE2ESellerSession()!;
  const buyer = getE2ESession()!;
  const threadId = opts.threadId ?? scenario.routeSheetThreadId!;
  const agreementIndex =
    opts.agreementId != null
      ? undefined
      : (opts.agreementIndex ?? takeNextAgreementIndex());
  const agreementId =
    opts.agreementId ??
    scenario.routeSheetAgreementIds?.[agreementIndex!] ??
    scenario.routeSheetAgreementId!;
  const carrierPhone = opts.carrierPhone ?? scenario.carrierPhone!;
  const primaryCarrierToken = carrierSessionTokenForPhone(
    scenario,
    carrierPhone,
  );
  const titulo = `${opts.tituloPrefix ?? "Hoja Logística"} ${Date.now()}`;
  const tramoCount = opts.tramoCount ?? 1;

  const sellerPage = await openSellerPage(browser, seller.sessionToken, threadId);
  await waitForThreadContractsLoaded(sellerPage);
  const agreementTitle = await fetchAgreementTitleById(
    sellerPage,
    seller.sessionToken,
    threadId,
    agreementId,
  );

  await openRoutesRail(sellerPage);
  if (tramoCount === 1) {
    await setupRouteSheetWithCarrier(sellerPage, {
      titulo,
      tramos: [TRAMO_OPTS],
      carrierPhone,
    });
    await reloadChatThread(sellerPage);
    await openRoutesRail(sellerPage);
  } else {
    await clickNewRouteSheet(sellerPage);
    await waitForRouteSheetForm(sellerPage);
    await fillRouteSheetBasicFields(sellerPage, titulo);
    await deleteTramoAt(sellerPage, 1);
    await fillTramoFields(sellerPage, 0, TRAMO_OPTS);
    await searchCarrierPhone(sellerPage, 0, carrierPhone);
    await insertTramoAfter(sellerPage, 0);
    await fillTramoFields(sellerPage, 1, TRAMO_OPTS_2);
    const phone2 = opts.carrier2Phone ?? carrierPhone;
    await searchCarrierPhone(sellerPage, 1, phone2);
    await saveRouteSheet(sellerPage);
    await reloadChatThread(sellerPage);
    await openRoutesRail(sellerPage);
  }

  await openRailContracts(sellerPage);
  if (!opts.skipLink) {
    await expect
      .poll(
        async () => {
          try {
            const id = await resolveRouteSheetIdByTitulo(
              sellerPage,
              threadId,
              seller.sessionToken,
              titulo,
            );
            return id.length > 0;
          } catch {
            return false;
          }
        },
        { timeout: 60_000 },
      )
      .toBe(true);
    const routeSheetId = await resolveRouteSheetIdByTitulo(
      sellerPage,
      threadId,
      seller.sessionToken,
      titulo,
    );
    const { linkAgreementToRouteSheetViaApi } = await import(
      "./e2e-logistics-api"
    );
    await linkAgreementToRouteSheetViaApi(
      sellerPage,
      seller.sessionToken,
      threadId,
      agreementId,
      routeSheetId,
    );
    await reloadChatThread(sellerPage);
    await openRailContracts(sellerPage);
    await openContractByAgreementTitle(sellerPage, agreementTitle);
    await expect(
      sellerPage.getByText(/vinculada ahora a:/i).first(),
    ).toContainText(titulo, { timeout: 15_000 });
  }

  if (opts.publish !== false) {
    if (opts.skipLink) {
      await openRoutesRail(sellerPage);
      await openRouteSheetDetail(sellerPage, titulo);
    } else {
      await openRoutesRail(sellerPage);
      await ensureRouteSheetDetailOpen(sellerPage, titulo);
    }
    await publishRouteSheetViaUI(sellerPage);
    await clickInviteCarriers(sellerPage);
    await sendCarrierInvites(sellerPage);
  }

  const routeSheetId = await resolveRouteSheetIdByTitulo(
    sellerPage,
    threadId,
    seller.sessionToken,
    titulo,
  );

  const carrierPage = await newAuthenticatedPage(
    browser,
    primaryCarrierToken,
  );
  await acceptPreselInviteAsCarrier(
    carrierPage,
    threadId,
    routeSheetId,
    primaryCarrierToken,
  );
  await carrierPage.context().close();

  if (tramoCount === 2 && opts.carrier2Phone && scenario.carrier2SessionToken) {
    const carrier2Page = await newAuthenticatedPage(
      browser,
      scenario.carrier2SessionToken,
    );
    await acceptPreselInviteAsCarrier(
      carrier2Page,
      threadId,
      routeSheetId,
      scenario.carrier2SessionToken,
    );
    await carrier2Page.context().close();
  }

  if (tramoCount === 2) {
    const stopIdsForConfirm = await fetchRouteSheetStopIds(
      sellerPage,
      seller.sessionToken,
      threadId,
      routeSheetId,
    );
    const phone2 = opts.carrier2Phone ?? carrierPhone;
    const distinctCarriers = phone2.trim() !== carrierPhone.trim();
    const primaryCarrierUserId = (scenario.carrierUserId ?? carrierPhone).trim();
    const stop0 = stopIdsForConfirm[0];
    const stop1 = stopIdsForConfirm[1];

    await ensureCarrierConfirmedOnSheetStops(sellerPage, seller.sessionToken, {
      threadId,
      routeSheetId,
      carrierUserId: primaryCarrierUserId,
      stopIds: distinctCarriers
        ? stop0
          ? [stop0]
          : []
        : stopIdsForConfirm,
    });

    if (distinctCarriers && stop1) {
      const secondaryCarrierUserId = (scenario.carrier2UserId ?? phone2).trim();
      const confirmedViaApi = await ensureCarrierConfirmedOnSheetStops(
        sellerPage,
        seller.sessionToken,
        {
          threadId,
          routeSheetId,
          carrierUserId: secondaryCarrierUserId,
          stopIds: [stop1],
        },
      )
        .then(() => true)
        .catch(() => false);

      if (!confirmedViaApi) {
        await ensureRouteSheetDetailOpen(sellerPage, titulo);
        await openSubscribersPanel(sellerPage);
        await openTramoInSubscribersPanel(sellerPage, 2, titulo);
        await openFirstCarrierInSubscribersPanel(sellerPage);
        const panel = subscribersPanel(sellerPage);
        const acceptBtn = panel
          .getByRole("button", { name: /aceptar en este tramo/i })
          .first();
        if (await acceptBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          await acceptBtn.click();
          const confirmModal = sellerPage
            .getByRole("dialog")
            .filter({ hasText: /confirmar transportista/i });
          await confirmModal
            .getByRole("button", { name: /sí, confirmar/i })
            .click()
            .catch(() => null);
        }
        await closeSubscribersPanelIfOpen(sellerPage);
      }
    }
  }

  if (opts.payRoutes !== false) {
    if (opts.payRoutesViaBuyerApi) {
      const stopIdsForPay = await fetchRouteSheetStopIds(
        sellerPage,
        seller.sessionToken,
        threadId,
        routeSheetId,
      );
      // Linked tramos share one route path; checkout expects the path id (head stop), not each stop id.
      const routePathIdsForPay =
        stopIdsForPay.length > 1 ? [stopIdsForPay[0]!] : stopIdsForPay;
      const payPage = await newAuthenticatedPage(browser, buyer.sessionToken);
      const payRes = await payRouteStopsViaBuyerApi(
        payPage,
        buyer.sessionToken,
        { threadId, agreementId, routeStopIds: routePathIdsForPay },
      );
      if (payRes.status >= 400) {
        throw new Error(
          `Buyer API route payment failed (${payRes.status}): ${payRes.text}`,
        );
      }
      await payPage.context().close();
    } else {
      const buyerCtx = await browser.newContext();
      await buyerCtx.addInitScript((t: string) => {
        sessionStorage.setItem("vt_session_active", "1");
        sessionStorage.setItem("vt_session_token", t);
      }, buyer.sessionToken);
      const buyerPage = await buyerCtx.newPage();
      await openChatThread(buyerPage, threadId);
      await waitForChatReady(buyerPage);
      await reloadChatThread(buyerPage);
      await payAllRoutePathsAsBuyer(buyerPage, agreementTitle, titulo);
      await buyerCtx.close();
    }
  }

  const stopIds = await fetchRouteSheetStopIds(
    sellerPage,
    seller.sessionToken,
    threadId,
    routeSheetId,
  );

  if (opts.payRoutes !== false && stopIds[0]) {
    await waitForDeliveryOwner(
      sellerPage,
      seller.sessionToken,
      threadId,
      agreementId,
      stopIds[0],
    );
    await postCarrierTelemetryApi(sellerPage, primaryCarrierToken, {
      threadId,
      agreementId,
      routeSheetId,
      routeStopId: stopIds[0],
      lat: -34.6037,
      lng: -58.3816,
      reportedAtUtc: new Date().toISOString(),
      sourceClientId: "e2e_setup_in_transit",
    });
    await waitForDeliveryState(
      sellerPage,
      seller.sessionToken,
      threadId,
      agreementId,
      stopIds[0],
      "in_transit",
    );
  }

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
