import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCatalogCategories } from '@features/catalog/api/fetchCatalogCategories'
import { fetchCurrencies } from '@features/market/api/fetchCurrencies'
import { fetchStoreDetail, storeDetailQueryKey } from '@features/market/api/fetchStoreDetail'
import { useStoreDetail } from '@features/market/hooks/useStoreDetail'
import { useAppStore } from '@features/auth/store/useAppStore'
import { setMarketHydrating } from '@features/market/api/marketPersistence'
import { mergeStoreCatalogWithLocalExtras } from '@features/market/model/storeCatalogTypes'
import type { StoreDetailOwner } from '@features/market/api/fetchStoreDetail'
import { useMarketStore } from '@features/market/model/store/useMarketStore'
export const storeCatalogMetaQueryKey = ['store-catalog-meta'] as const

export function useStoreCatalogMeta() {
  const categories = useQuery({
    queryKey: [...storeCatalogMetaQueryKey, 'categories'],
    queryFn: fetchCatalogCategories,
    staleTime: 60_000,
  })
  const currencies = useQuery({
    queryKey: [...storeCatalogMetaQueryKey, 'currencies'],
    queryFn: fetchCurrencies,
    staleTime: 60_000,
  })
  return {
    catalogCategories: categories.data ?? [],
    catalogCurrencies: currencies.data ?? [],
    isMetaLoading: categories.isLoading || currencies.isLoading,
  }
}

/** Carga detalle de tienda vía React Query y sincroniza Zustand. */
export function useStorePageDetail(
  storeId: string | undefined,
  viewerUserId: string,
  loadNonce: number,
) {
  const query = useStoreDetail(storeId, viewerUserId)
  const detail = query.data

  useEffect(() => {
    if (!storeId || !detail) return
    setMarketHydrating(true)
    try {
      useMarketStore.setState((s) => ({
        stores: { ...s.stores, [storeId]: detail.store },
        storeCatalogs: {
          ...s.storeCatalogs,
          [storeId]: mergeStoreCatalogWithLocalExtras(
            s.storeCatalogs[storeId],
            detail.catalog,
          ),
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
          profileTrustScores: {
            ...s.profileTrustScores,
            [o.id]: o.trustScore,
          },
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
    } finally {
      setMarketHydrating(false)
    }
  }, [storeId, detail, loadNonce])

  return {
    detailStatus: query.isLoading ? ('loading' as const)
      : query.isError ? ('error' as const)
      : ('ready' as const),
    detailOwnerProfile: (detail?.owner ?? null) as StoreDetailOwner | null,
    refetchDetail: query.refetch,
    isFetching: query.isFetching,
  }
}

export async function reloadStoreDetailToStore(
  storeId: string,
  viewerUserId: string,
): Promise<void> {
  const data = await fetchStoreDetail(storeId, { userId: viewerUserId })
  setMarketHydrating(true)
  try {
    useMarketStore.setState((s) => ({
      stores: { ...s.stores, [storeId]: data.store },
      storeCatalogs: {
        ...s.storeCatalogs,
        [storeId]: mergeStoreCatalogWithLocalExtras(
          s.storeCatalogs[storeId],
          data.catalog,
        ),
      },
    }))
  } finally {
    setMarketHydrating(false)
  }
}

export { storeDetailQueryKey }
