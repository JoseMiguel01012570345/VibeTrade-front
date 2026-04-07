import type { StoreBadge } from '../../app/store/marketStoreTypes'
import type { StoreCatalog } from '../../pages/chat/domain/storeCatalogTypes'
import { apiFetch } from '../http/apiClient'

export type StoreDetailResponse = {
  store: StoreBadge
  catalog: StoreCatalog
  viewer?: { userId?: string | null; role?: string | null }
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
    throw new Error(t || `store detail ${res.status}`)
  }
  return res.json() as Promise<StoreDetailResponse>
}
