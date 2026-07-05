import { apiFetch } from "@shared/services/http/apiClient";
import { throwFromResponse } from "@shared/services/http/throwFromResponse";

export type { ToggleLikeResult } from "../Dtos/offerEngagementApiTypes";
import type { ToggleLikeResult } from "../Dtos/offerEngagementApiTypes";

export async function toggleOfferLike(offerId: string): Promise<ToggleLikeResult> {
  const res = await apiFetch(
    `/api/v1/market/offers/${encodeURIComponent(offerId)}/like`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as ToggleLikeResult;
}
