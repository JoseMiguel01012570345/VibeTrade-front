import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchStoreDetailByName,
  storeDetailByNameQueryKey,
  storeDetailQueryKey,
} from '@features/market/api/fetchStoreDetail'
import type { StoreDetailResponse } from '@features/market/api/fetchStoreDetail'
import { setMarketHydrating } from '@features/market/api/marketPersistence'
import { mergeStoreCatalogWithLocalExtras } from '@features/market/logic/storeCatalogTypes'
import { normStoreName } from '@features/market/logic/store/marketSliceHelpers'
import { findStoreByNormalizedName } from '@features/market/logic/store/storePath'
import { useMarketStore } from '@features/market/logic/store/useMarketStore'
import { useAppStore } from '@features/auth/logic/useAppStore'

import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";

export type StoreNameResolution = {
  storeId: string | undefined
  resolving: boolean
  notFound: boolean
  /** Ficha recién resuelta por nombre (incluye avatarUrl antes de hidratar Zustand). */
  fetchedStore?: StoreBadge
}

/**
 * Resuelve el id de una tienda a partir del nombre de la URL pública (`{base}/{nombre}`).
 *
 * 1. Si la tienda ya está en el estado (cargada por el feed/búsqueda/perfil, o creada
 *    localmente por el dueño), se usa esa —así el dueño ve su tienda recién creada aunque
 *    aún no esté persistida en el backend—.
 * 2. Si no, se pide al backend por nombre normalizado y se hidrata en el estado. Además se
 *    siembra la caché por-id para que `useStorePageDetail(storeId)` no repita la petición.
 */
export function useStoreIdFromName(
  storeNameParam: string | undefined,
  viewerUserId: string,
): StoreNameResolution {
  const queryClient = useQueryClient()
  const decoded = decodeStoreNameParam(storeNameParam)
  const normalized = normStoreName(decoded)

  const loadedId = useMarketStore(
    (s) => findStoreByNormalizedName(s.stores, normalized)?.id,
  )

  const enabled = Boolean(normalized && viewerUserId.trim() && !loadedId)
  const query = useQuery({
    queryKey: storeDetailByNameQueryKey(normalized || 'idle', viewerUserId),
    queryFn: () => fetchStoreDetailByName(decoded, { userId: viewerUserId }),
    enabled,
    staleTime: 30_000,
    retry: false,
  })

  const detail = query.data

  useEffect(() => {
    if (!detail) return
    hydrateStoreDetail(detail, viewerUserId, queryClient)
  }, [detail, viewerUserId, queryClient])

  return {
    storeId: loadedId ?? detail?.store.id,
    resolving: enabled && query.isLoading,
    notFound: enabled && query.isError,
    fetchedStore: detail?.store,
  }
}

function decodeStoreNameParam(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function hydrateStoreDetail(
  detail: StoreDetailResponse,
  viewerUserId: string,
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  const id = detail.store.id
  setMarketHydrating(true)
  try {
    useMarketStore.setState((s) => ({
      stores: { ...s.stores, [id]: detail.store },
      storeCatalogs: {
        ...s.storeCatalogs,
        [id]: mergeStoreCatalogWithLocalExtras(s.storeCatalogs[id], detail.catalog),
      },
    }))
    if (detail.owner) {
      const o = detail.owner
      const nm = o.name?.trim() ?? ''
      useAppStore.setState((s) => ({
        profileDisplayNames: {
          ...s.profileDisplayNames,
          [o.id]: nm || s.profileDisplayNames[o.id] || '',
        },
        profileTrustScores: { ...s.profileTrustScores, [o.id]: o.trustScore },
        ...(o.avatarUrl?.trim()
          ? {
              profileAvatarUrls: {
                ...s.profileAvatarUrls,
                [o.id]: o.avatarUrl.trim(),
              },
            }
          : {}),
      }))
    }
    // Sembrar la caché por-id: useStorePageDetail(storeId) reutiliza este detalle.
    queryClient.setQueryData(storeDetailQueryKey(id, viewerUserId), detail)
  } finally {
    setMarketHydrating(false)
  }
}
