import type { Browser, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { chatE2EReady, getE2EScenario } from "./chat-env";
import { openSellerPage } from "./agreement-ui-helpers";
import { openRailContracts } from "./chat-helpers";
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
  searchCarrierPhone,
  openRouteSheetDetail,
  publishRouteSheetViaUI,
  linkRouteSheetToAgreementViaUI,
  openContractByAgreementIndex,
  openFirstUnlinkedContract,
  openNotificationsPanel,
  getNotificationItem,
} from "./route-sheet-ui-helpers";
import { findEmergentOfferUrlViaCatalogSearchUI } from "./e2e-catalog-search";

const TODAY = new Date();
const TOMORROW = new Date(TODAY);
TOMORROW.setDate(TODAY.getDate() + 1);
const DAY_AFTER = new Date(TODAY);
DAY_AFTER.setDate(TODAY.getDate() + 2);
const DAY_AFTER_PLUS = new Date(DAY_AFTER);
DAY_AFTER_PLUS.setDate(DAY_AFTER.getDate() + 1);

export const isoTomorrow = TOMORROW.toISOString().slice(0, 10);
export const isoDayAfter = DAY_AFTER.toISOString().slice(0, 10);
export const isoDayAfterPlus = DAY_AFTER_PLUS.toISOString().slice(0, 10);

export function rsReady(): boolean {
  const s = getE2EScenario();
  return (
    chatE2EReady() && !!s?.routeSheetThreadId && !!s?.routeSheetAgreementId
  );
}

export function hasCarrierSession(): boolean {
  return !!getE2EScenario()?.carrierSessionToken;
}

export const rsSkipReason =
  "Route sheet scenario not provisioned — run global-setup with API on :5110";

export const carrierSkipReason =
  "Carrier scenario not provisioned — run global-setup with API on :5110 (carrier provisioning requires full UI provisioning)";

export const TRAMO_OPTS = {
  origen: "Ciudad A",
  destino: "Ciudad B",
  recogidaDate: isoTomorrow,
  recogidaTime: "09:00",
  entregaDate: isoDayAfter,
  entregaTime: "17:00",
  precio: "150",
  responsabilidad: "Transportista",
  requisitos: "Ninguno",
  tipoVehiculo: "Camión",
  carga: "Paquetes",
};

export const TRAMO_OPTS_2 = {
  origen: "Ciudad B",
  destino: "Ciudad C",
  recogidaDate: isoDayAfterPlus,
  recogidaTime: "09:00",
  entregaDate: isoDayAfterPlus,
  entregaTime: "17:00",
  precio: "200",
  responsabilidad: "Transportista",
  requisitos: "Ninguno",
  tipoVehiculo: "Camión",
  carga: "Paquetes",
};

export const TRAMO_OPTS_SOCIAL = {
  origen: "Ciudad Social A",
  destino: "Ciudad Social B",
  recogidaDate: isoTomorrow,
  recogidaTime: "09:00",
  entregaDate: isoDayAfter,
  entregaTime: "17:00",
  precio: "120",
  responsabilidad: "Transportista",
  requisitos: "Ninguno",
  tipoVehiculo: "Camión",
  carga: "General",
};

/** Shared state across serial carrier-invite tests. */
export const carrierInviteFlowState = {
  routeSheetId: "",
  routeSheetTitulo: "",
  multiRouteSheetId: "",
  multiRouteSheetTitulo: "",
  publishedOfferUrl: "",
  publishedRouteSheetTitulo: "",
};

export async function resolveRouteSheetIdByTitulo(
  page: Page,
  threadId: string,
  sessionToken: string,
  titulo: string,
): Promise<string> {
  let id = "";
  await expect
    .poll(
      async () => {
        id = await page.evaluate(
          async ([tid, token, title]: [string, string, string]) => {
            const res = await fetch(
              `/api/v1/chat/threads/${encodeURIComponent(tid)}/route-sheets`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!res.ok) return "";
            const json = (await res.json()) as unknown;
            const sheets = Array.isArray(json)
              ? json
              : ((json as { items?: unknown[] })?.items ?? []);
            for (const raw of sheets) {
              const sheet = raw as {
                id?: string;
                titulo?: string;
                payload?: { titulo?: string };
              };
              const sheetTitle = (sheet.titulo ?? sheet.payload?.titulo ?? "").trim();
              if (sheetTitle === title && sheet.id?.trim()) return sheet.id.trim();
            }
            return "";
          },
          [threadId, sessionToken, titulo] as [string, string, string],
        );
        return id.length > 2;
      },
      { timeout: 45_000 },
    )
    .toBe(true);
  return id;
}

type TramoOpts = typeof TRAMO_OPTS;

/** Creates a route sheet with one or more tramos and preselected carrier phones. */
export async function setupRouteSheetWithCarrier(
  page: Page,
  opts: {
    titulo: string;
    tramos: TramoOpts[];
    carrierPhone: string;
  },
): Promise<void> {
  await clickNewRouteSheet(page);
  await waitForRouteSheetForm(page);
  await fillRouteSheetBasicFields(page, opts.titulo);
  await deleteTramoAt(page, 1);
  for (let i = 0; i < opts.tramos.length; i++) {
    if (i > 0) await insertTramoAfter(page, i - 1);
    await fillTramoFields(page, i, opts.tramos[i]!);
    await searchCarrierPhone(page, i, opts.carrierPhone);
  }
  await saveRouteSheet(page);
}

/** Carrier accepts a presel invite and lands on the chat thread. */
export async function acceptPreselInviteAsCarrier(
  carrierPage: Page,
  threadId: string,
  routeSheetId: string,
  sessionToken?: string,
): Promise<void> {
  const token =
    sessionToken?.trim() ??
    (await carrierPage
      .goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 })
      .then(() =>
        carrierPage.evaluate(() => sessionStorage.getItem("vt_session_token")),
      )
      .catch(() => null)) ??
    "";

  if (token) {
    await carrierPage.goto("/", {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    for (let attempt = 0; attempt < 6; attempt++) {
      const ok = await carrierPage
        .evaluate(
          async ([tid, rsid, tkn]: [string, string, string]) => {
            const res = await fetch(
              `/api/v1/chat/threads/${encodeURIComponent(tid)}/route-sheet-presel-invite`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${tkn}`,
                },
                body: JSON.stringify({ routeSheetId: rsid, accepted: true }),
              },
            );
            return res.ok;
          },
          [threadId, routeSheetId, token] as [string, string, string],
        )
        .catch(() => false);
      if (ok) {
        await carrierPage
          .goto(`/chat/${threadId}`, {
            waitUntil: "domcontentloaded",
            timeout: 45_000,
          })
          .catch(() => null);
        return;
      }
      await carrierPage.waitForTimeout(1_500);
    }
  }

  const inviteUrl = `/invite/presel/${threadId}?sheet=${encodeURIComponent(routeSheetId)}`;
  const routeModal = carrierPage
    .getByRole("dialog")
    .filter({ hasText: /tramo|ruta|hoja|invitaci/i });

  let modalVisible = false;
  for (let attempt = 0; attempt < 4; attempt++) {
    await carrierPage.goto(inviteUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    modalVisible = await routeModal.isVisible({ timeout: 6_000 }).catch(() => false);
    if (modalVisible) break;
    await carrierPage.waitForTimeout(1_500);
  }

  if (!modalVisible) {
    await carrierPage.goto("/", { waitUntil: "domcontentloaded", timeout: 45_000 });
    await openNotificationsPanel(carrierPage);
    const inviteNotif = getNotificationItem(
      carrierPage,
      /contacto de transporte|hoja de ruta|invitaci[oó]n/i,
    );
    await expect(inviteNotif).toBeVisible({ timeout: 30_000 });
    await inviteNotif.evaluate((el) => {
      (el as HTMLElement).click();
    });
    await expect(routeModal).toBeVisible({ timeout: 15_000 });
  }

  await routeModal
    .getByRole("button", { name: /aceptar|participar|integrarme/i })
    .first()
    .click();
  await carrierPage
    .goto(`/chat/${threadId}`, { waitUntil: "domcontentloaded", timeout: 45_000 })
    .catch(() => null);
}

async function resolvePublishedOfferUrl(
  page: Page,
  threadId: string,
  sellerToken: string,
  titulo: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const emoId = await page
      .evaluate(
        async ([tid, token]: [string, string]) => {
          const res = await fetch(
            `/api/v1/chat/threads/${encodeURIComponent(tid)}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!res.ok) return "";
          const dto = (await res.json()) as Record<string, unknown>;
          const oid = String(dto["offerId"] ?? "").trim();
          return oid.startsWith("emo_") ? oid : "";
        },
        [threadId, sellerToken] as [string, string],
      )
      .catch(() => "");
    if (emoId) return `/offer/${emoId}`;

    const fromSearchUi = await findEmergentOfferUrlViaCatalogSearchUI(page, titulo).catch(
      () => null,
    );
    if (fromSearchUi) return fromSearchUi;

    await page.waitForTimeout(1_500);
  }
  return null;
}

/**
 * Creates and publishes a route sheet for social/carrier tests.
 * Returns the seller page (caller must close its context) and the public offer URL.
 */
export async function createAndPublishRouteSheet(
  browser: Browser,
  sellerToken: string,
  threadId: string,
  agreementTitle?: string,
  agreementIndex = 0,
): Promise<{ sellerPage: Page; titulo: string; offerUrl: string | null }> {
  const sellerPage = await openSellerPage(browser, sellerToken, threadId);
  await waitForThreadContractsLoaded(sellerPage);
  await openRoutesRail(sellerPage);

  const titulo = agreementTitle ?? `Hoja Social ${Date.now()}`;
  await clickNewRouteSheet(sellerPage);
  await waitForRouteSheetForm(sellerPage);
  await fillRouteSheetBasicFields(sellerPage, titulo);
  await deleteTramoAt(sellerPage, 1);
  await fillTramoFields(sellerPage, 0, TRAMO_OPTS_SOCIAL);
  await saveRouteSheet(sellerPage);

  await openRailContracts(sellerPage);
  await openFirstUnlinkedContract(sellerPage);
  await linkRouteSheetToAgreementViaUI(sellerPage, titulo);

  await openRoutesRail(sellerPage);
  await openRouteSheetDetail(sellerPage, titulo);

  await publishRouteSheetViaUI(sellerPage);
  await sellerPage.waitForTimeout(1_000);

  const offerUrl = await resolvePublishedOfferUrl(
    sellerPage,
    threadId,
    sellerToken,
    titulo,
  );

  return { sellerPage, titulo, offerUrl };
}
