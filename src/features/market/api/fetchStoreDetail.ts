import { apiFetch } from '@shared/services/http/apiClient'
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from '@shared/services/http/apiErrorMessage'

export type {
  StoreDetailOwner,
  StoreDetailResponse,
} from '../Dtos/fetchStoreDetailTypes';
import type { StoreDetailResponse } from '../Dtos/fetchStoreDetailTypes';

export async function fetchStoreDetail(
  storeId: string,
  viewer: { userId: string; viewerRole?: string | null },
): Promise<StoreDetailResponse> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/detail`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        viewerUserId: viewer.userId,
        viewerRole: viewer.viewerRole ?? null,
      }),
    },
  )
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()))
  }
  return res.json() as Promise<StoreDetailResponse>
}

export const storeDetailQueryKey = (storeId: string, viewerUserId: string) =>
  ['store-detail', storeId, viewerUserId] as const
