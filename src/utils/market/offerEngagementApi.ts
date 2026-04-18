import { useAppStore } from "../../app/store/useAppStore";
import { apiFetch } from "../http/apiClient";
import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from "../http/apiErrorMessage";
import { getOrCreateGuestId } from "../auth/guestId";

type ToggleBody = { guestId?: string };

function engagementBody(): ToggleBody {
  const { isSessionActive } = useAppStore.getState();
  if (isSessionActive) return {};
  return { guestId: getOrCreateGuestId() };
}

export type ToggleLikeResult = { liked: boolean; likeCount: number };

export async function toggleOfferLike(offerId: string): Promise<ToggleLikeResult> {
  const res = await apiFetch(
    `/api/v1/market/offers/${encodeURIComponent(offerId)}/like`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(engagementBody()),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    );
  }
  return (await res.json()) as ToggleLikeResult;
}

export async function toggleOfferQaCommentLike(
  offerId: string,
  qaCommentId: string,
): Promise<ToggleLikeResult> {
  const res = await apiFetch(
    `/api/v1/market/offers/${encodeURIComponent(offerId)}/qa/${encodeURIComponent(qaCommentId)}/like`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(engagementBody()),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    );
  }
  return (await res.json()) as ToggleLikeResult;
}
