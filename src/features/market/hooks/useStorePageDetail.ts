import { useEffect } from 'react'
import { fetchStoreDetail, storeDetailQueryKey } from '@features/market/api/fetchStoreDetail'
import { useCatalogCategories } from '@features/catalog/hooks/useCatalogCategories'
import { useCurrencies } from '@features/market/hooks/useCurrencies'
import { useStoreDetail } from '@features/market/hooks/useStoreDetail'
import { useAppStore } from '@features/auth/logic/useAppStore'
import { setMarketHydrating } from '@features/market/api/marketPersistence'
import { mergeStoreCatalogWithLocalExtras } from '@features/market/logic/storeCatalogTypes'
import type { StoreDetailOwner } from '@features/market/api/fetchStoreDetail'
import { useMarketStore } from '@features/market/logic/store/useMarketStore'

export function useStoreCatalogMeta() {
  const categories = useCatalogCategories()
  const currencies = useCurrencies()
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
