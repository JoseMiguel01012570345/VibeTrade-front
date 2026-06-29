import type { TrustHistoryEntry } from "@features/profile/Dtos/trustLedgerTypes";
import { apiFetch } from "@shared/services/http/apiClient";
import type {
  TrustAdjustResponseApi,
  TrustHistoryItemApi,
} from "../Dtos/trustLedgerDtos";

export type { TrustAdjustResponseApi, TrustHistoryItemApi } from "../Dtos/trustLedgerDtos";

export function trustHistoryItemFromApi(x: TrustHistoryItemApi): TrustHistoryEntry {
  const t = Date.parse(x.at);
  return {
    id: x.id,
    at: Number.isFinite(t) ? t : Date.now(),
    delta: x.delta,
    balanceAfter: x.balanceAfter,
    reason: x.reason,
  };
}

export async function fetchMeTrustHistory(limit = 100): Promise<TrustHistoryEntry[]> {
  const res = await apiFetch(`/api/v1/me/trust-history?limit=${limit}`);
  if (!res.ok) throw new Error(`trust-history ${res.status}`);
  const data = (await res.json()) as TrustHistoryItemApi[];
  return Array.isArray(data) ? data.map(trustHistoryItemFromApi) : [];
}

export async function fetchStoreTrustHistory(
  storeId: string,
  limit = 100,
): Promise<TrustHistoryEntry[]> {
  const sid = encodeURIComponent(storeId.trim());
  const res = await apiFetch(`/api/v1/stores/${sid}/trust-history?limit=${limit}`);
  if (!res.ok) throw new Error(`store-trust-history ${res.status}`);
  const data = (await res.json()) as TrustHistoryItemApi[];
  return Array.isArray(data) ? data.map(trustHistoryItemFromApi) : [];
}

export async function postMeTrustAdjust(
  delta: number,
  reason: string,
): Promise<TrustAdjustResponseApi> {
  const res = await apiFetch("/api/v1/me/trust-adjust", {
    method: "POST",
    body: JSON.stringify({ delta, reason }),
  });
  if (!res.ok) throw new Error(`trust-adjust ${res.status}`);
  return (await res.json()) as TrustAdjustResponseApi;
}

export async function postStoreTrustAdjust(
  storeId: string,
  delta: number,
  reason: string,
): Promise<TrustAdjustResponseApi> {
  const sid = encodeURIComponent(storeId.trim());
  const res = await apiFetch(`/api/v1/stores/${sid}/trust-adjust`, {
    method: "POST",
    body: JSON.stringify({ delta, reason }),
  });
  if (!res.ok) throw new Error(`store-trust-adjust ${res.status}`);
  return (await res.json()) as TrustAdjustResponseApi;
}
