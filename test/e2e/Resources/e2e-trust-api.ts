import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const PARTY_EXIT_TRUST_PER_MEMBER = 3;
export const SELLER_HELD_EXIT_PENALTY = 15;
export const CARRIER_EXIT_PER_STOP = 3;

/** Lee trust del usuario vía GET /api/v1/auth/public-profile/{userId}. */
export async function fetchUserTrustScore(
  page: Page,
  userId: string,
): Promise<number> {
  const score = await page.evaluate(async (uid: string) => {
    const token = sessionStorage.getItem("vt_session_token");
    const headers: Record<string, string> = {};
    if (token?.trim()) headers.Authorization = `Bearer ${token.trim()}`;
    const res = await fetch(
      `/api/v1/auth/public-profile/${encodeURIComponent(uid)}`,
      { headers },
    );
    if (!res.ok) throw new Error(`public-profile ${res.status}`);
    const json = (await res.json()) as { trustScore?: number };
    return json.trustScore ?? Number.NaN;
  }, userId);
  if (!Number.isFinite(score)) {
    throw new Error(`Could not parse user trust for ${userId}`);
  }
  return score;
}

/** Lee el puntaje de confianza visible en la ficha pública de la tienda. */
export async function fetchStoreTrustScore(
  page: Page,
  storeId: string,
): Promise<number> {
  const paths = [`/store/${storeId}/vitrina`, `/store/${storeId}`];
  let trustBlock = page.getByLabel(/confianza de la tienda/i);
  for (const path of paths) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    trustBlock = page.getByLabel(/confianza de la tienda/i);
    if (await trustBlock.isVisible({ timeout: 15_000 }).catch(() => false)) {
      break;
    }
  }
  await expect(trustBlock).toBeVisible({ timeout: 30_000 });
  const text = await trustBlock.getByText(/\d+\s*\/\s*100/).first().textContent();
  const match = text?.match(/(\d+)\s*\/\s*100/);
  if (!match?.[1]) {
    throw new Error(`Could not parse store trust from UI: ${text ?? ""}`);
  }
  return Number(match[1]);
}

export type TrustHistoryEntryApi = {
  id: string;
  at: string;
  delta: number;
  balanceAfter: number;
  reason: string;
};

export async function fetchStoreTrustHistory(
  page: Page,
  storeId: string,
  sessionToken: string,
  limit = 50,
): Promise<TrustHistoryEntryApi[]> {
  const rows = await page.evaluate(
    async ([sid, token, lim]: [string, string, number]) => {
      const res = await fetch(
        `/api/v1/stores/${encodeURIComponent(sid)}/trust-history?limit=${lim}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`store-trust-history ${res.status}`);
      const data = (await res.json()) as unknown;
      return Array.isArray(data) ? data : [];
    },
    [storeId, sessionToken, limit] as [string, string, number],
  );
  return rows as TrustHistoryEntryApi[];
}

export async function expectStoreTrustLedgerContains(
  page: Page,
  storeId: string,
  sessionToken: string,
  pattern: RegExp | string,
): Promise<void> {
  const history = await fetchStoreTrustHistory(page, storeId, sessionToken);
  const re = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
  const hit = history.some((e) => re.test(e.reason ?? ""));
  if (!hit) {
    const sample = history
      .slice(0, 5)
      .map((e) => e.reason)
      .join(" | ");
    throw new Error(
      `Store trust ledger missing ${re}: recent reasons: ${sample || "(empty)"}`,
    );
  }
}
