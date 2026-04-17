import type { StoreBadge } from '../../app/store/marketStoreTypes'
import type { StoreCatalog } from '../../pages/chat/domain/storeCatalogTypes'
import { apiFetch } from '../http/apiClient'
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from '../http/apiErrorMessage'

/** Dueño persistido (perfil público) incluido en detalle de tienda para la vitrina. */
export type StoreDetailOwner = {
  id: string
  name: string
  avatarUrl?: string
  trustScore: number
}

export type StoreDetailResponse = {
  store: StoreBadge
  catalog: StoreCatalog
  viewer?: { userId?: string | null; role?: string | null }
  owner?: StoreDetailOwner
}

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
