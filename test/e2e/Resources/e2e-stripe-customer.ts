import type { Page } from "@playwright/test";

export const E2E_DEMO_CARD_LAST4 = "4242";

export type E2EStripeSavedCard = {
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

/** Creates Stripe customer (skip mode) or real customer via POST setup-intents. */
export async function ensureStripeCustomerViaFetch(
  sessionToken: string,
  baseURL: string,
): Promise<boolean> {
  const origin = baseURL.replace(/\/$/, "");
  try {
    const res = await fetch(`${origin}/api/v1/payments/stripe/setup-intents`, {
      method: "POST",
      headers: authHeaders(sessionToken),
      body: "{}",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listStripeCardsViaFetch(
  sessionToken: string,
  baseURL: string,
): Promise<E2EStripeSavedCard[]> {
  const origin = baseURL.replace(/\/$/, "");
  try {
    const res = await fetch(`${origin}/api/v1/payments/stripe/payment-methods`, {
      headers: authHeaders(sessionToken),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as E2EStripeSavedCard[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function ensureStripeCustomerViaPage(
  page: Page,
  baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
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
      `${origin}/api/v1/payments/stripe/setup-intents`,
      { data: {}, headers },
    );
    return res.ok();
  } catch {
    return false;
  }
}

export async function listStripeCardsViaPage(
  page: Page,
  baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
): Promise<E2EStripeSavedCard[]> {
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
      `${origin}/api/v1/payments/stripe/payment-methods`,
      { headers },
    );
    if (!res.ok()) return [];
    const data = (await res.json()) as E2EStripeSavedCard[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** True when skip-mode demo card or any saved card is available for checkout. */
export async function buyerHasStripeCardViaPage(
  page: Page,
  baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
): Promise<boolean> {
  await ensureStripeCustomerViaPage(page, baseURL);
  const cards = await listStripeCardsViaPage(page, baseURL);
  return cards.some((c) => (c.id ?? "").trim().length > 0);
}
