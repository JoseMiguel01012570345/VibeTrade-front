import type { Page } from "@playwright/test";
import { listStripeCardsViaFetch } from "./e2e-stripe-customer";

export type E2ERouteStopDelivery = {
  routeSheetId: string;
  routeStopId: string;
  state: string;
  currentOwnerUserId?: string | null;
  lastTelemetryProgressFraction?: number | null;
  proximityNotifiedAtUtc?: string | null;
};

export type E2ETelemetryLatestPoint = {
  routeSheetId: string;
  routeStopId: string;
  carrierUserId: string;
  lat: number;
  lng: number;
  progressFraction?: number | null;
  offRoute: boolean;
  reportedAtUtc: string;
  speedKmh?: number | null;
  avatarUrl?: string | null;
};

export type E2EChatNotification = {
  id: string;
  kind: string;
  title?: string;
  body?: string;
  createdAtUtc?: string;
  payloadJson?: string;
};

type FetchResult<T> = { status: number; ok: boolean; data: T; text: string };

async function e2eAuthorizedFetch<T = unknown>(
  page: Page,
  token: string,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<FetchResult<T>> {
  return page.evaluate(
    async ([p, t, method, bodyJson]: [string, string, string, string | null]) => {
      const res = await fetch(p, {
        method,
        headers: {
          Authorization: `Bearer ${t}`,
          ...(bodyJson ? { "Content-Type": "application/json" } : {}),
        },
        body: bodyJson ?? undefined,
      });
      const text = await res.text().catch(() => "");
      let data: unknown = null;
      if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }
      return {
        status: res.status,
        ok: res.ok,
        data: data as T,
        text,
      };
    },
    [
      path,
      token,
      init?.method ?? "GET",
      init?.body != null ? JSON.stringify(init.body) : null,
    ] as [string, string, string, string | null],
  );
}

export type E2ETradeAgreementApi = {
  id: string;
  title: string;
  status?: string;
};

export async function fetchTradeAgreements(
  page: Page,
  token: string,
  threadId: string,
): Promise<E2ETradeAgreementApi[]> {
  const res = await e2eAuthorizedFetch<E2ETradeAgreementApi[]>(
    page,
    token,
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/trade-agreements`,
  );
  if (!res.ok) {
    throw new Error(`fetchTradeAgreements failed: ${res.status} ${res.text}`);
  }
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchAgreementTitleById(
  page: Page,
  token: string,
  threadId: string,
  agreementId: string,
): Promise<string> {
  const list = await fetchTradeAgreements(page, token, threadId);
  const match = list.find((a) => a.id.trim() === agreementId.trim());
  const title = (match?.title ?? "").trim();
  if (title.length < 3) {
    throw new Error(
      `Agreement title not found for ${agreementId} (got ${list.length} agreements)`,
    );
  }
  return title;
}

export async function fetchRouteDeliveries(
  page: Page,
  token: string,
  threadId: string,
  agreementId: string,
): Promise<E2ERouteStopDelivery[]> {
  const res = await e2eAuthorizedFetch<E2ERouteStopDelivery[]>(
    page,
    token,
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/agreements/${encodeURIComponent(agreementId)}/logistics/deliveries`,
  );
  if (!res.ok) {
    throw new Error(`fetchRouteDeliveries failed: ${res.status} ${res.text}`);
  }
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchRouteSheetStopIds(
  page: Page,
  token: string,
  threadId: string,
  routeSheetId: string,
): Promise<string[]> {
  const res = await e2eAuthorizedFetch<unknown>(
    page,
    token,
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets`,
  );
  if (!res.ok) {
    throw new Error(`fetchRouteSheetStopIds failed: ${res.status}`);
  }
  const sheets = Array.isArray(res.data)
    ? res.data
    : ((res.data as { items?: unknown[] })?.items ?? []);
  for (const raw of sheets) {
    const sheet = raw as {
      id?: string;
      paradas?: { id?: string }[];
      payload?: { paradas?: { id?: string }[] };
    };
    if ((sheet.id ?? "").trim() !== routeSheetId.trim()) continue;
    const paradas = sheet.paradas ?? sheet.payload?.paradas ?? [];
    return paradas
      .map((p) => (p.id ?? "").trim())
      .filter((id) => id.length > 0);
  }
  return [];
}

export async function fetchRouteSheetTitles(
  page: Page,
  token: string,
  threadId: string,
): Promise<string[]> {
  const res = await e2eAuthorizedFetch<unknown>(
    page,
    token,
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets`,
  );
  if (!res.ok) {
    throw new Error(`fetchRouteSheetTitles failed: ${res.status}`);
  }
  const sheets = Array.isArray(res.data)
    ? res.data
    : ((res.data as { items?: unknown[] })?.items ?? []);
  return sheets
    .map((raw) => {
      const sheet = raw as { titulo?: string; payload?: { titulo?: string } };
      return (sheet.titulo ?? sheet.payload?.titulo ?? "").trim();
    })
    .filter((t) => t.length > 0);
}

export async function waitForRouteSheetDelivered(
  page: Page,
  token: string,
  threadId: string,
  tituloSubstring: string,
  timeoutMs = 30_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await e2eAuthorizedFetch<unknown>(
      page,
      token,
      `/api/v1/chat/threads/${encodeURIComponent(threadId)}/route-sheets`,
    );
    if (res.ok) {
      const sheets = Array.isArray(res.data)
        ? res.data
        : ((res.data as { items?: unknown[] })?.items ?? []);
      const match = sheets.find((raw) => {
        const sheet = raw as {
          titulo?: string;
          payload?: { titulo?: string; estado?: string; publicadaPlataforma?: boolean };
          estado?: string;
          publicadaPlataforma?: boolean;
        };
        const titulo = (sheet.titulo ?? sheet.payload?.titulo ?? "").trim();
        if (!titulo.includes(tituloSubstring)) return false;
        const estado = (sheet.estado ?? sheet.payload?.estado ?? "").trim();
        const published =
          sheet.publicadaPlataforma ?? sheet.payload?.publicadaPlataforma ?? true;
        return estado.toLowerCase() === "entregada" && published === false;
      });
      if (match) return;
    }
    await page.waitForTimeout(500);
  }
  throw new Error(
    `Route sheet not marked delivered after ${timeoutMs}ms: ${tituloSubstring}`,
  );
}

export async function postCarrierTelemetryApi(
  page: Page,
  token: string,
  args: {
    threadId: string;
    agreementId: string;
    routeSheetId: string;
    routeStopId: string;
    lat: number;
    lng: number;
    reportedAtUtc: string;
    sourceClientId: string;
  },
): Promise<{ status: number; speedKmh?: number | null; avatarUrl?: string | null }> {
  const res = await e2eAuthorizedFetch<{
    speedKmh?: number | null;
    avatarUrl?: string | null;
  }>(
    page,
    token,
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/telemetry`,
    {
      method: "POST",
      body: {
        routeSheetId: args.routeSheetId,
        routeStopId: args.routeStopId,
        lat: args.lat,
        lng: args.lng,
        reportedAtUtc: args.reportedAtUtc,
        sourceClientId: args.sourceClientId,
      },
    },
  );
  return {
    status: res.status,
    speedKmh: res.data?.speedKmh ?? null,
    avatarUrl: res.data?.avatarUrl ?? null,
  };
}

export async function fetchLatestTelemetry(
  page: Page,
  token: string,
  threadId: string,
  agreementId: string,
  routeSheetId: string,
): Promise<E2ETelemetryLatestPoint[]> {
  const qs = new URLSearchParams({ routeSheetId });
  const res = await e2eAuthorizedFetch<E2ETelemetryLatestPoint[]>(
    page,
    token,
    `/api/v1/chat/threads/${encodeURIComponent(threadId)}/agreements/${encodeURIComponent(agreementId)}/logistics/telemetry/latest?${qs.toString()}`,
  );
  if (!res.ok) {
    throw new Error(`fetchLatestTelemetry failed: ${res.status} ${res.text}`);
  }
  return Array.isArray(res.data) ? res.data : [];
}

export async function waitForDeliveryOwner(
  page: Page,
  token: string,
  threadId: string,
  agreementId: string,
  routeStopId: string,
  timeoutMs = 30_000,
): Promise<E2ERouteStopDelivery> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await fetchRouteDeliveries(page, token, threadId, agreementId);
    const row = rows.find((r) => r.routeStopId === routeStopId);
    if (row?.currentOwnerUserId?.trim()) return row;
    await page.waitForTimeout(500);
  }
  throw new Error(
    `Delivery owner not granted for ${routeStopId} within ${timeoutMs}ms`,
  );
}

export async function ensureCarrierLegReadyForCede(
  page: Page,
  carrierToken: string,
  scenario: {
    threadId: string;
    agreementId: string;
    routeSheetId: string;
    stopIds: string[];
  },
  tramoIndex = 0,
): Promise<void> {
  const routeStopId = scenario.stopIds[tramoIndex] ?? scenario.stopIds[0];
  if (!routeStopId) return;
  await waitForDeliveryOwner(
    page,
    carrierToken,
    scenario.threadId,
    scenario.agreementId,
    routeStopId,
    tramoIndex > 0 ? 60_000 : 30_000,
  );
  await postCarrierTelemetryApi(page, carrierToken, {
    threadId: scenario.threadId,
    agreementId: scenario.agreementId,
    routeSheetId: scenario.routeSheetId,
    routeStopId,
    lat: -34.6037,
    lng: -58.3816,
    reportedAtUtc: new Date().toISOString(),
    sourceClientId: `e2e_cede_prep_${tramoIndex}`,
  });
  await waitForDeliveryState(
    page,
    carrierToken,
    scenario.threadId,
    scenario.agreementId,
    routeStopId,
    "in_transit",
    tramoIndex > 0 ? 60_000 : 30_000,
  );
}

export async function postCedeOwnershipApi(
  page: Page,
  token: string,
  args: {
    threadId: string;
    agreementId: string;
    routeSheetId: string;
    routeStopId: string;
  },
): Promise<{ status: number; ok: boolean }> {
  const res = await e2eAuthorizedFetch<{ ok?: boolean }>(
    page,
    token,
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/ownership/cede`,
    {
      method: "POST",
      body: {
        routeSheetId: args.routeSheetId,
        routeStopId: args.routeStopId,
      },
    },
  );
  return { status: res.status, ok: res.ok && (res.data?.ok ?? res.ok), text: res.text };
}

export async function upsertCarrierEvidenceApi(
  page: Page,
  token: string,
  args: {
    threadId: string;
    agreementId: string;
    routeSheetId: string;
    routeStopId: string;
    text: string;
    submit: boolean;
  },
): Promise<{ status: number }> {
  const qs = new URLSearchParams({
    routeSheetId: args.routeSheetId,
    routeStopId: args.routeStopId,
  });
  const res = await e2eAuthorizedFetch(
    page,
    token,
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/evidence?${qs.toString()}`,
    {
      method: "PUT",
      body: { text: args.text, attachments: [], submit: args.submit },
    },
  );
  return { status: res.status };
}

export async function decideCarrierEvidenceApi(
  page: Page,
  token: string,
  args: {
    threadId: string;
    agreementId: string;
    routeSheetId: string;
    routeStopId: string;
    decision: "accept" | "reject";
  },
): Promise<{ status: number }> {
  const qs = new URLSearchParams({
    routeSheetId: args.routeSheetId,
    routeStopId: args.routeStopId,
  });
  const res = await e2eAuthorizedFetch(
    page,
    token,
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/evidence/decide?${qs.toString()}`,
    {
      method: "POST",
      body: {
        decision: args.decision === "accept" ? "accepted" : "rejected",
      },
    },
  );
  return { status: res.status };
}

export type ApiLegContext = {
  threadId: string;
  agreementId: string;
  routeSheetId: string;
  routeStopId: string;
};

/** Seller confirms pending carrier subscription on a sheet (optionally one stop). */
export async function acceptCarrierSubscriptionOnSheetApi(
  page: Page,
  sellerToken: string,
  args: {
    threadId: string;
    routeSheetId: string;
    carrierUserId: string;
    stopId?: string;
  },
): Promise<{ status: number }> {
  const res = await e2eAuthorizedFetch(
    page,
    sellerToken,
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/route-tramo-subscriptions/accept`,
    {
      method: "POST",
      body: {
        routeSheetId: args.routeSheetId,
        carrierUserId: args.carrierUserId,
        ...(args.stopId?.trim() ? { stopId: args.stopId.trim() } : {}),
      },
    },
  );
  return { status: res.status };
}

/** Waits for ownership and moves leg to in_transit when needed (cede precondition). */
export async function ensureStopReadyForCedeApi(
  page: Page,
  carrierToken: string,
  ctx: ApiLegContext,
  timeoutMs = 60_000,
): Promise<void> {
  await waitForDeliveryOwner(
    page,
    carrierToken,
    ctx.threadId,
    ctx.agreementId,
    ctx.routeStopId,
    timeoutMs,
  );
  const rows = await fetchRouteDeliveries(
    page,
    carrierToken,
    ctx.threadId,
    ctx.agreementId,
  );
  const row = rows.find((r) => r.routeStopId === ctx.routeStopId);
  const state = (row?.state ?? "").trim().toLowerCase();
  if (state === "in_transit") return;

  const tel = await postCarrierTelemetryApi(page, carrierToken, {
    threadId: ctx.threadId,
    agreementId: ctx.agreementId,
    routeSheetId: ctx.routeSheetId,
    routeStopId: ctx.routeStopId,
    lat: -34.6,
    lng: -58.4,
    reportedAtUtc: new Date().toISOString(),
    sourceClientId: `e2e_ready_${ctx.routeStopId}`,
  });
  if (tel.status >= 400) {
    throw new Error(
      `ensureStopReadyForCedeApi telemetry failed for ${ctx.routeStopId}: HTTP ${tel.status}`,
    );
  }
  await waitForDeliveryState(
    page,
    carrierToken,
    ctx.threadId,
    ctx.agreementId,
    ctx.routeStopId,
    "in_transit",
    timeoutMs,
  );
}

/** API smoke: in_transit → telemetry → cede → evidence → seller accept. */
export async function completeLegEvidenceFlowViaApi(
  page: Page,
  carrierToken: string,
  sellerToken: string,
  ctx: ApiLegContext,
  opts: { evidenceText?: string; telemetryClientId?: string } = {},
): Promise<void> {
  await ensureStopReadyForCedeApi(page, carrierToken, ctx);

  const tel = await postCarrierTelemetryApi(page, carrierToken, {
    threadId: ctx.threadId,
    agreementId: ctx.agreementId,
    routeSheetId: ctx.routeSheetId,
    routeStopId: ctx.routeStopId,
    lat: -34.601,
    lng: -58.381,
    reportedAtUtc: new Date().toISOString(),
    sourceClientId: opts.telemetryClientId ?? `l16_${ctx.routeStopId}`,
  });
  if (tel.status >= 400) {
    throw new Error(
      `telemetry smoke failed for ${ctx.routeStopId}: HTTP ${tel.status}`,
    );
  }

  const cede = await postCedeOwnershipApi(page, carrierToken, ctx);
  if (!cede.ok || cede.status >= 400) {
    throw new Error(
      `cede failed for ${ctx.routeStopId}: HTTP ${cede.status}${cede.text ? ` — ${cede.text}` : ""}`,
    );
  }

  const ev = await upsertCarrierEvidenceApi(page, carrierToken, {
    ...ctx,
    text: opts.evidenceText ?? `L16 evidence ${ctx.routeStopId}`,
    submit: true,
  });
  if (ev.status >= 400) {
    throw new Error(
      `evidence submit failed for ${ctx.routeStopId}: HTTP ${ev.status}`,
    );
  }

  await waitForDeliveryState(
    page,
    sellerToken,
    ctx.threadId,
    ctx.agreementId,
    ctx.routeStopId,
    "evidence_submitted",
  );

  const decide = await decideCarrierEvidenceApi(page, sellerToken, {
    ...ctx,
    decision: "accept",
  });
  if (decide.status >= 400) {
    throw new Error(
      `evidence accept failed for ${ctx.routeStopId}: HTTP ${decide.status}`,
    );
  }

  await waitForDeliveryState(
    page,
    sellerToken,
    ctx.threadId,
    ctx.agreementId,
    ctx.routeStopId,
    "evidence_accepted",
  );
}

export async function postSellerPauseApi(
  page: Page,
  token: string,
  args: {
    threadId: string;
    agreementId: string;
    routeSheetId: string;
    routeStopId: string;
    reason: string;
  },
): Promise<{ status: number }> {
  const res = await e2eAuthorizedFetch(
    page,
    token,
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/deliveries/seller-pause`,
    {
      method: "POST",
      body: {
        routeSheetId: args.routeSheetId,
        routeStopId: args.routeStopId,
        reason: args.reason,
      },
    },
  );
  return { status: res.status };
}

export async function postSellerResumeApi(
  page: Page,
  token: string,
  args: {
    threadId: string;
    agreementId: string;
    routeSheetId: string;
    routeStopId: string;
    targetCarrierUserId: string;
  },
): Promise<{ status: number }> {
  const res = await e2eAuthorizedFetch(
    page,
    token,
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/logistics/deliveries/seller-resume-from-idle`,
    {
      method: "POST",
      body: {
        routeSheetId: args.routeSheetId,
        routeStopId: args.routeStopId,
        targetCarrierUserId: args.targetCarrierUserId,
      },
    },
  );
  return { status: res.status };
}

export async function fetchNotifications(
  page: Page,
  token: string,
  fromUtc?: string,
): Promise<E2EChatNotification[]> {
  const qs = fromUtc
    ? `?from=${encodeURIComponent(fromUtc)}`
    : "";
  const res = await e2eAuthorizedFetch<E2EChatNotification[]>(
    page,
    token,
    `/api/v1/me/notifications${qs}`,
  );
  if (!res.ok) {
    throw new Error(`fetchNotifications failed: ${res.status} ${res.text}`);
  }
  return Array.isArray(res.data) ? res.data : [];
}

export function notificationsWithKind(
  list: E2EChatNotification[],
  kind: string,
): E2EChatNotification[] {
  return list.filter((n) => (n.kind ?? "").trim() === kind);
}

export async function postCarrierWithdrawApi(
  page: Page,
  token: string,
  threadId: string,
  reason = "E2E carrier withdraw",
  tradeAgreementId?: string,
): Promise<{ status: number; text: string }> {
  const res = await e2eAuthorizedFetch(
    page,
    token,
    `/api/v1/policies/chat/threads/${encodeURIComponent(threadId)}/route-tramo-subscriptions/carrier-withdraw`,
    {
      method: "POST",
      body: {
        reason,
        ...(tradeAgreementId?.trim()
          ? { tradeAgreementId: tradeAgreementId.trim() }
          : {}),
      },
    },
  );
  return { status: res.status, text: res.text };
}

async function ensureE2EApiOrigin(page: Page, threadId: string): Promise<void> {
  if (!page.url().includes(threadId)) {
    await page.goto(`/chat/${encodeURIComponent(threadId)}`, {
      waitUntil: "domcontentloaded",
    });
  }
}

export async function postPartySoftLeaveApi(
  page: Page,
  token: string,
  threadId: string,
  reason = "E2E party soft leave",
  tradeAgreementId?: string,
): Promise<{ status: number; text: string }> {
  await ensureE2EApiOrigin(page, threadId);
  const res = await e2eAuthorizedFetch(
    page,
    token,
    `/api/v1/policies/chat/threads/${encodeURIComponent(threadId)}/party-soft-leave`,
    {
      method: "POST",
      body: {
        reason,
        ...(tradeAgreementId?.trim()
          ? { tradeAgreementId: tradeAgreementId.trim() }
          : {}),
      },
    },
  );
  return { status: res.status, text: res.text };
}

export async function waitForDeliveryState(
  page: Page,
  token: string,
  threadId: string,
  agreementId: string,
  routeStopId: string,
  expectedState: string,
  timeoutMs = 30_000,
): Promise<E2ERouteStopDelivery> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await fetchRouteDeliveries(page, token, threadId, agreementId);
    const row = rows.find((r) => r.routeStopId === routeStopId);
    if (row && row.state.trim().toLowerCase() === expectedState.trim().toLowerCase()) {
      return row;
    }
    await page.waitForTimeout(800);
  }
  throw new Error(
    `Delivery state for ${routeStopId} did not become ${expectedState} within ${timeoutMs}ms`,
  );
}

export async function payRouteStopsViaBuyerApi(
  page: Page,
  buyerToken: string,
  args: {
    threadId: string;
    agreementId: string;
    routeStopIds: string[];
  },
): Promise<{ status: number; text: string }> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const cards = await listStripeCardsViaFetch(buyerToken, baseURL);
  const paymentMethodId =
    cards.find((c) => (c.id ?? "").trim().length > 0)?.id ??
    `pm_test_skip_${Date.now()}`;
  const res = await e2eAuthorizedFetch(
    page,
    buyerToken,
    `/api/v1/chat/threads/${encodeURIComponent(args.threadId)}/agreements/${encodeURIComponent(args.agreementId)}/payments/execute`,
    {
      method: "POST",
      body: {
        currency: "USD",
        paymentMethodId,
        idempotencyKey: `idem-e2e-${Date.now()}`,
        selectedRoutePathIds: args.routeStopIds,
        selectedMerchandiseLineIds: null,
        selectedServicePayments: null,
      },
    },
  );
  return { status: res.status, text: res.text };
}
