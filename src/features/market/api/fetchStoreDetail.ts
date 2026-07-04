import { apiFetch } from '@shared/services/http/apiClient'
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from '@shared/services/http/apiErrorMessage'

export type {
  StoreDetailOwner,
  StoreDetailResponse,
} from '../Dtos/fetchStoreDetailTypes';
import type { StoreDetailResponse } from '../Dtos/fetchStoreDetailTypes';

async function postStoreDetail(
  path: string,
  viewer: { userId: string; viewerRole?: string | null },
): Promise<StoreDetailResponse> {
  const res = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      viewerUserId: viewer.userId,
      viewerRole: viewer.viewerRole ?? null,
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()))
  }
  return res.json() as Promise<StoreDetailResponse>
}

export async function fetchStoreDetail(
  storeId: string,
  viewer: { userId: string; viewerRole?: string | null },
): Promise<StoreDetailResponse> {
  return postStoreDetail(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/detail`,
    viewer,
  )
}

/**
 * Resuelve el detalle de una tienda por su nombre exacto (la URL pública es
 * `{base}/{nombre}`). El backend normaliza el nombre igual que el índice único,
 * así que la coincidencia es insensible a mayúsculas y espacios colapsados.
 */
export async function fetchStoreDetailByName(
  storeName: string,
  viewer: { userId: string; viewerRole?: string | null },
): Promise<StoreDetailResponse> {
  return postStoreDetail(
    `/api/v1/market/stores/by-name/${encodeURIComponent(storeName)}/detail`,
    viewer,
  )
}

export const storeDetailQueryKey = (storeId: string, viewerUserId: string) =>
  ['store-detail', storeId, viewerUserId] as const

export const storeDetailByNameQueryKey = (
  normalizedName: string,
  viewerUserId: string,
) => ['store-detail-by-name', normalizedName, viewerUserId] as const
