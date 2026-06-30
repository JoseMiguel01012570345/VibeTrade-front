import type { Page } from "@playwright/test";
import { getE2EApiBaseUrl, getE2EAppBaseUrl } from "./e2e-api-base";

export const E2E_DEMO_CARD_LAST4 = "4242";
/** Matches <see cref="SimulatedPaymentGateway.DemoPaymentMethodId"/> on the API. */
export const E2E_SIM_DEMO_PAYMENT_METHOD_ID = "sim_pm_demo";

export type E2ESavedCard = {
  id: string;
  brand: string;
  last4: string;
};

function authHeaders(sessionToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = sessionToken?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Creates simulated payment account via POST setup-intents. */
export async function ensurePaymentAccountViaFetch(
  sessionToken: string,
  baseURL = getE2EApiBaseUrl(),
): Promise<boolean> {
  const origin = baseURL.replace(/\/$/, "");
  try {
    const res = await fetch(`${origin}/api/v1/payments/gateway/setup-intents`, {
      method: "POST",
      headers: authHeaders(sessionToken),
      body: "{}",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Ensures the buyer has a simulated payment account and at least one demo card.
 * GET payment-methods auto-provisions `sim_acc_*` on the API; POST setup-intents is a fallback.
 */
export async function ensureBuyerPaymentReady(
  sessionToken: string,
): Promise<boolean> {
  const token = sessionToken.trim();
  if (!token) return false;

  const origins = [getE2EApiBaseUrl(), getE2EAppBaseUrl()];
  for (let attempt = 0; attempt < 6; attempt++) {
    for (const origin of origins) {
      const cards = await listSavedCardsViaFetch(token, origin);
      if (cards.some((c) => (c.id ?? "").trim().length > 0)) {
        return true;
      }
      await ensurePaymentAccountViaFetch(token, origin);
      const afterSetup = await listSavedCardsViaFetch(token, origin);
      if (afterSetup.some((c) => (c.id ?? "").trim().length > 0)) {
        return true;
      }
    }
    await sleep(1_000);
  }
  return false;
}

/** Resolves `sim_pm_demo` or the first saved card after provisioning. */
export async function resolveBuyerPaymentMethodId(
  sessionToken: string,
): Promise<string> {
  await ensureBuyerPaymentReady(sessionToken);
  const cards = await listSavedCardsViaFetch(sessionToken);
  return (
    cards.find((c) => (c.id ?? "").trim().length > 0)?.id ??
    E2E_SIM_DEMO_PAYMENT_METHOD_ID
  );
}

export async function listSavedCardsViaFetch(
  sessionToken: string,
  baseURL = getE2EApiBaseUrl(),
): Promise<E2ESavedCard[]> {
  const origin = baseURL.replace(/\/$/, "");
  try {
    const res = await fetch(`${origin}/api/v1/payments/gateway/payment-methods`, {
      headers: authHeaders(sessionToken),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as E2ESavedCard[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function ensurePaymentAccountViaPage(
  page: Page,
  baseURL = getE2EAppBaseUrl(),
): Promise<boolean> {
  const origin = baseURL.replace(/\/$/, "");
  const token = await page
    .evaluate(() => sessionStorage.getItem("vt_session_token") ?? "")
    .catch(() => "");
  const headers: Record<string, string> = {};
  if (token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  try {
    const res = await page.request.post(
      `${origin}/api/v1/payments/gateway/setup-intents`,
      { data: {}, headers },
    );
    return res.ok();
  } catch {
    return false;
  }
}

export async function listSavedCardsViaPage(
  page: Page,
  baseURL = getE2EAppBaseUrl(),
): Promise<E2ESavedCard[]> {
  const origin = baseURL.replace(/\/$/, "");
  const token = await page
    .evaluate(() => sessionStorage.getItem("vt_session_token") ?? "")
    .catch(() => "");
  const headers: Record<string, string> = {};
  if (token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }
  try {
    const res = await page.request.get(
      `${origin}/api/v1/payments/gateway/payment-methods`,
      { headers },
    );
    if (!res.ok()) return [];
    const data = (await res.json()) as E2ESavedCard[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** True when demo card or any saved card is available for checkout. */
export async function buyerHasSavedCardViaPage(
  page: Page,
  baseURL = getE2EAppBaseUrl(),
): Promise<boolean> {
  const token = await page
    .evaluate(() => sessionStorage.getItem("vt_session_token") ?? "")
    .catch(() => "");
  if (token.trim()) {
    return ensureBuyerPaymentReady(token);
  }
  await ensurePaymentAccountViaPage(page, baseURL);
  const cards = await listSavedCardsViaPage(page, baseURL);
  return cards.some((c: E2ESavedCard) => (c.id ?? "").trim().length > 0);
}
