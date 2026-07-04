import type { Browser, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  buyerRespondToAgreement,
  createThreadAsBuyer,
  injectE2ESession,
  openAgreementDetailInRail,
  openSellerPage,
  sellerEmitServiceAgreement,
} from "./agreement-ui-helpers";
import { getE2EScenario, getE2ESellerSession, getE2ESession, getE2EToken, e2eOfferId } from "./chat-env";
import { waitForAgreementBubble, reloadChatThread, openRailContracts } from "./chat-helpers";
import {
  fetchAgreementTitleById,
  fetchRouteSheetStopIds,
  ensureCarrierConfirmedOnSheetStops,
  waitForStopSubscriptionStatus,
} from "./e2e-logistics-api";
import {
  openCarrierPage,
  setupPaidRouteLogisticsScenario,
  newAuthenticatedPage,
  type PaidLogisticsScenario,
} from "./e2e-logistics-env";
import {
  clickPayCurrency,
  confirmInformeCheckbox,
  enableServiceForPayment,
  ensureBuyerDemoCard,
  openChatPaymentModal,
  pickServiceRecurrences,
} from "./payment-checkout-ui-helpers";
import {
  clickInviteCarriers,
  clickNewRouteSheet,
  deleteTramoAt,
  fillRouteSheetBasicFields,
  fillTramoFields,
  insertTramoAfter,
  kickCarrierFromTramo,
  linkRouteSheetToAgreementViaUI,
  openContractByAgreementIndex,
  openContractByAgreementTitle,
  openLinkedRouteSheetFromContractDetail,
  openRoutesRail,
  publishRouteSheetViaUI,
  ensureRouteSheetDetailOpen,
  saveRouteSheet,
  searchCarrierPhone,
  sendCarrierInvites,
  waitForRouteSheetForm,
  waitForThreadContractsLoaded,
} from "./route-sheet-ui-helpers";
import {
  acceptPreselInviteAsCarrier,
  resolveRouteSheetIdByTitulo,
  TRAMO_OPTS,
  TRAMO_OPTS_2,
} from "./route-sheet-carriers-env";
import { findEmergentOfferUrlViaCatalogSearchUI } from "./e2e-catalog-search";
import { takeNextAgreementIndex } from "./e2e-logistics-env";

export type AcceptedAgreementScenario = {
  threadId: string;
  agreementId: string;
  agreementTitle: string;
  serviceNamePart?: string;
};

async function resolveAgreementIdByTitle(
  page: Page,
  token: string,
  threadId: string,
  title: string,
): Promise<string> {
  const agreementId = await page.evaluate(
    async ([tid, tok, agrTitle]: [string, string, string]) => {
      const res = await fetch(
        `/api/v1/chat/threads/${encodeURIComponent(tid)}/trade-agreements`,
        { headers: { Authorization: `Bearer ${tok}` } },
      );
      if (!res.ok) return "";
      const items = (await res.json()) as Array<{ id?: string; title?: string }>;
      return (
        items.find((x) => (x.title ?? "").trim() === agrTitle.trim())?.id?.trim() ??
        ""
      );
    },
    [threadId, token, title] as [string, string, string],
  );
  expect(agreementId.length).toBeGreaterThan(2);
  return agreementId;
}

export async function setupAcceptedServiceAgreementNoPayments(
  browser: Browser,
  offerId: string,
  buyerToken: string,
  opts: { titlePrefix?: string; serviceNamePart?: string } = {},
): Promise<AcceptedAgreementScenario> {
  const seller = getE2ESellerSession()!;
  const title = `${opts.titlePrefix ?? "E2E Exit Svc"} ${Date.now()}`;
  const serviceNamePart = opts.serviceNamePart ?? "Consultoría E2E";

  const { buyerPage, threadId } = await createThreadAsBuyer(
    browser,
    buyerToken,
    offerId,
  );
  const sellerPage = await openSellerPage(
    browser,
    seller.sessionToken,
    threadId,
  );
  await sellerEmitServiceAgreement(sellerPage, { title, serviceNamePart });
  await waitForAgreementBubble(buyerPage, title);
  await buyerRespondToAgreement(buyerPage, title, "accept");
  const agreementId = await resolveAgreementIdByTitle(
    buyerPage,
    buyerToken,
    threadId,
    title,
  );
  await sellerPage.close();
  await buyerPage.context().close();

  return { threadId, agreementId, agreementTitle: title, serviceNamePart };
}

type FreshServiceThread = {
  threadId: string;
  agreementId: string;
  agreementTitle: string;
  serviceNamePart: string;
};

/** Hilo comprador+vendedor aislado (evita party-soft-leave en el hilo RS compartido del global-setup). */
export async function provisionFreshServiceThread(
  browser: Browser,
  titlePrefix: string,
  serviceNamePart = "Consultoría E2E",
): Promise<FreshServiceThread> {
  const seller = getE2ESellerSession()!;
  const title = `${titlePrefix} AGR ${Date.now()}`;
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
  await sellerEmitServiceAgreement(sellerPage, { title, serviceNamePart });
  await waitForAgreementBubble(buyerPage, title);
  await buyerRespondToAgreement(buyerPage, title, "accept");
  const agreementId = await buyerPage.evaluate(
    async ([tid, token, agrTitle]: [string, string, string]) => {
      const res = await fetch(
        `/api/v1/chat/threads/${encodeURIComponent(tid)}/trade-agreements`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return "";
      const items = (await res.json()) as Array<{ id?: string; title?: string }>;
      return (
        items.find((x) => (x.title ?? "").trim() === agrTitle)?.id?.trim() ?? ""
      );
    },
    [threadId, getE2EToken(), title] as [string, string, string],
  );
  expect(agreementId.length).toBeGreaterThan(2);
  await buyerPage.context().close();
  await sellerPage.close();
  return { threadId, agreementId, agreementTitle: title, serviceNamePart };
}

export async function setupRouteWithConfirmedCarriers(
  browser: Browser,
  opts: {
    tituloPrefix?: string;
    tramoCount?: 1 | 2;
    carrier2Phone?: string;
    payRoutes?: boolean;
  } = {},
): Promise<PaidLogisticsScenario> {
  const fresh = await provisionFreshServiceThread(
    browser,
    opts.tituloPrefix ?? "E2E Exit Route",
  );
  return setupPaidRouteLogisticsScenario(browser, {
    tituloPrefix: opts.tituloPrefix ?? "E2E Exit Route",
    tramoCount: opts.tramoCount ?? 1,
    carrier2Phone: opts.carrier2Phone,
    payRoutes: opts.payRoutes ?? false,
    publish: true,
    threadId: fresh.threadId,
    agreementId: fresh.agreementId,
  });
}

export async function setupPaidRouteForExitPolicies(
  browser: Browser,
  opts: {
    tituloPrefix?: string;
    tramoCount?: 1 | 2;
    payRoutes?: boolean;
  } = {},
): Promise<PaidLogisticsScenario> {
  const fresh = await provisionFreshServiceThread(
    browser,
    opts.tituloPrefix ?? "E2E Exit Paid Route",
  );
  return setupPaidRouteLogisticsScenario(browser, {
    tituloPrefix: opts.tituloPrefix ?? "E2E Exit Paid Route",
    tramoCount: opts.tramoCount ?? 1,
    payRoutes: opts.payRoutes ?? false,
    publish: true,
    threadId: fresh.threadId,
    agreementId: fresh.agreementId,
  });
}

export async function payHeldServiceAgreement(
  page: Page,
  threadId: string,
  serviceNamePart: string,
  agreementId?: string,
): Promise<void> {
  await ensureBuyerDemoCard(page, threadId);
  await openChatPaymentModal(page);
  await enableServiceForPayment(page, serviceNamePart);
  await pickServiceRecurrences(page, [/usd|único|unico|mensual|pago/i], serviceNamePart);
  await confirmInformeCheckbox(page);
  await clickPayCurrency(page, "USD");
  await expect(
    page
      .getByText(/pago exitoso|pagos completados|todo cobrado|recibo de pago/i)
      .first(),
  ).toBeVisible({ timeout: 60_000 });
  if (agreementId?.trim()) {
    const token =
      (await page.evaluate(() =>
        sessionStorage.getItem("vt_session_token"),
      )) ?? "";
    await expect
      .poll(
        async () => {
          const held = await page.evaluate(
            async ([tid, aid, tok]: [string, string, string]) => {
              const res = await fetch(
                `/api/v1/chat/threads/${encodeURIComponent(tid)}/agreements/${encodeURIComponent(aid)}/service-payments`,
                { headers: { Authorization: `Bearer ${tok}` } },
              );
              if (!res.ok) return 0;
              const rows = (await res.json()) as Array<{ status?: string }>;
              return rows.filter((r) => r.status === "held").length;
            },
            [threadId, agreementId.trim(), token] as [string, string, string],
          );
          return held;
        },
        { timeout: 45_000, intervals: [1_000, 2_000] },
      )
      .toBeGreaterThan(0);
  }
}

export async function submitServiceEvidencePendingViaUI(
  sellerPage: Page,
  agreementTitle: string,
  note = "Evidencia E2E pendiente",
): Promise<void> {
  await openAgreementDetailInRail(sellerPage, agreementTitle);
  const addBtn = sellerPage
    .getByRole("button", { name: /añadir evidencia|editar evidencia/i })
    .first();
  await expect(addBtn).toBeVisible({ timeout: 20_000 });
  await addBtn.click();
  const modal = sellerPage
    .getByRole("dialog")
    .filter({ hasText: /evidencia/i })
    .last();
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal.locator("textarea").first().fill(note);
  await modal.getByRole("button", { name: /enviar evidencia/i }).click();
  await expect(
    sellerPage.getByText(/evidencia enviada|pendiente/i).first(),
  ).toBeVisible({ timeout: 20_000 });
}

/** Comprador acepta evidencia vía API (estable para E2E tras envío del vendedor). */
export async function acceptServiceEvidenceViaApi(
  page: Page,
  token: string,
  threadId: string,
  agreementId: string,
): Promise<void> {
  const deadline = Date.now() + 60_000;
  let lastErr = "timeout";
  while (Date.now() < deadline) {
    const step = await page.evaluate(
      async ([tid, tok, aid]: [string, string, string]) => {
        const hdr: Record<string, string> = {
          Authorization: `Bearer ${tok}`,
          "Content-Type": "application/json",
        };
        const payRes = await fetch(
          `/api/v1/chat/threads/${encodeURIComponent(tid)}/agreements/${encodeURIComponent(aid)}/service-payments`,
          { headers: hdr },
        );
        if (!payRes.ok) return `payments:${payRes.status}`;
        const payments = (await payRes.json()) as Array<{
          id?: string;
          evidence?: { status?: string };
        }>;
        const pay = payments.find(
          (p) => (p.evidence?.status ?? "").trim().toLowerCase() === "submitted",
        );
        if (!pay?.id) return "no_submitted";
        const st = (pay.evidence?.status ?? "").trim().toLowerCase();
        if (st === "accepted") return "ok";
        const decRes = await fetch(
          `/api/v1/chat/threads/${encodeURIComponent(tid)}/agreements/${encodeURIComponent(aid)}/service-payments/${encodeURIComponent(pay.id)}/evidence/decision`,
          {
            method: "POST",
            headers: hdr,
            body: JSON.stringify({ decision: "accepted" }),
          },
        );
        if (!decRes.ok) return `decision:${decRes.status}`;
        return "ok";
      },
      [threadId, token, agreementId] as [string, string, string],
    );
    if (step === "ok") return;
    lastErr = step;
    await page.waitForTimeout(1_500);
  }
  throw new Error(`acceptServiceEvidenceViaApi failed: ${lastErr}`);
}

export async function acceptServiceEvidenceViaUI(
  page: Page,
  agreementTitle: string,
  opts: { token?: string; threadId?: string; agreementId?: string } = {},
): Promise<void> {
  const { token, threadId, agreementId } = opts;

  if (token && threadId && agreementId) {
    await acceptServiceEvidenceViaApi(page, token, threadId, agreementId);
  } else {
    await openAgreementDetailInRail(page, agreementTitle);
    const rail = page.getByRole("complementary", {
      name: /contratos, rutas e integrantes/i,
    });
    const row = rail
      .locator("div")
      .filter({ hasText: /pago retenido/i })
      .filter({ hasText: /evidencia:\s*submitted/i })
      .first();
    const acceptBtn = row.getByRole("button", { name: /^aceptar$/i });
    await acceptBtn.scrollIntoViewIfNeeded();
    await expect(acceptBtn).toBeVisible({ timeout: 20_000 });
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === "POST" &&
          r.url().includes("/evidence/decision") &&
          r.ok(),
        { timeout: 45_000 },
      ),
      acceptBtn.click(),
    ]);
  }

  if (threadId) {
    await reloadChatThread(page);
    await openAgreementDetailInRail(page, agreementTitle);
  }
  await expect(
    page.getByText(/evidencia:\s*accepted|evidencia aceptada/i).first(),
  ).toBeVisible({ timeout: 25_000 });
}

export async function openAuthenticatedChatListPage(
  browser: Browser,
  sessionToken: string,
): Promise<Page> {
  const ctx = await browser.newContext();
  await injectE2ESession(ctx, sessionToken);
  const page = await ctx.newPage();
  await page.goto("/chat", { waitUntil: "domcontentloaded" });
  return page;
}

export async function publishRouteSheetAndOpenEmergentOffer(
  sellerPage: Page,
  routeSheetTitulo: string,
): Promise<string> {
  await ensureRouteSheetDetailOpen(sellerPage, routeSheetTitulo);
  const publishBtn = sellerPage
    .getByRole("button", { name: /publicar en catálogo|publicar/i })
    .first();
  const needsPublish = await publishBtn
    .isVisible({ timeout: 3_000 })
    .catch(() => false);
  if (needsPublish) {
    await publishRouteSheetViaUI(sellerPage);
  }
  const url = await findEmergentOfferUrlViaCatalogSearchUI(
    sellerPage,
    routeSheetTitulo,
  );
  if (!url) {
    throw new Error(`Emergent offer URL not found for route sheet "${routeSheetTitulo}"`);
  }
  return url;
}

export async function setupPublishedRouteTwoTramosCarrierOnFirstOnly(
  browser: Browser,
  tituloPrefix: string,
): Promise<PaidLogisticsScenario> {
  const scenario = getE2EScenario()!;
  const seller = getE2ESellerSession()!;
  const threadId = scenario.routeSheetThreadId!;
  const agreementIndex = takeNextAgreementIndex();
  const agreementId =
    scenario.routeSheetAgreementIds?.[agreementIndex] ??
    scenario.routeSheetAgreementId!;
  const titulo = `${tituloPrefix} ${Date.now()}`;
  const carrierPhone = scenario.carrierPhone!;

  const sellerPage = await openSellerPage(
    browser,
    seller.sessionToken,
    threadId,
  );
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
  await fillTramoFields(sellerPage, 0, { ...TRAMO_OPTS, skipMapCoords: true });
  await searchCarrierPhone(sellerPage, 0, carrierPhone);
  await insertTramoAfter(sellerPage, 0);
  await fillTramoFields(sellerPage, 1, { ...TRAMO_OPTS_2, skipMapCoords: true });
  await saveRouteSheet(sellerPage);

  await openRailContracts(sellerPage);
  await openContractByAgreementIndex(sellerPage, agreementIndex);
  await linkRouteSheetToAgreementViaUI(sellerPage, titulo, agreementId);
  await reloadChatThread(sellerPage);
  await waitForThreadContractsLoaded(sellerPage);
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
      { timeout: 45_000 },
    )
    .toBe(true);
  await openContractByAgreementIndex(sellerPage, agreementIndex);
  await openLinkedRouteSheetFromContractDetail(sellerPage, titulo);
  await publishRouteSheetViaUI(sellerPage);
  await clickInviteCarriers(sellerPage);
  await sendCarrierInvites(sellerPage);

  const routeSheetId = await resolveRouteSheetIdByTitulo(
    sellerPage,
    threadId,
    seller.sessionToken,
    titulo,
  );

  const carrierPage = await newAuthenticatedPage(
    browser,
    scenario.carrierSessionToken!,
  );
  await acceptPreselInviteAsCarrier(
    carrierPage,
    threadId,
    routeSheetId,
    scenario.carrierSessionToken!,
  );
  await carrierPage.context().close();

  const stopIds = await fetchRouteSheetStopIds(
    sellerPage,
    seller.sessionToken,
    threadId,
    routeSheetId,
  );
  const firstStopId = stopIds[0];
  if (firstStopId) {
    await ensureCarrierConfirmedOnSheetStops(sellerPage, seller.sessionToken, {
      threadId,
      routeSheetId,
      carrierUserId: scenario.carrierUserId!,
      stopIds: [firstStopId],
    });
    await waitForStopSubscriptionStatus(
      sellerPage,
      seller.sessionToken,
      {
        threadId,
        routeSheetId,
        stopId: firstStopId,
        status: "confirmed",
      },
    );
  }

  await sellerPage.close();

  return {
    threadId,
    agreementId,
    agreementTitle,
    routeSheetId,
    routeSheetTitulo: titulo,
    stopIds,
  };
}

export { kickCarrierFromTramo as expelCarrierFromTramoViaUI };
export { openCarrierPage, setupPaidRouteLogisticsScenario };

export function scenarioBuyerUserId(): string {
  return getE2ESession()!.userId;
}

export function scenarioSellerStoreId(): string {
  return getE2EScenario()!.storeId;
}

export function scenarioCarrierUserId(): string {
  return getE2EScenario()!.carrierUserId!;
}

export function scenarioCarrier2Phone(): string | undefined {
  return getE2EScenario()?.carrier2Phone;
}

export function scenarioCarrier2SessionToken(): string | undefined {
  return getE2EScenario()?.carrier2SessionToken;
}
