import { useMutation } from '@tanstack/react-query'
import {
  searchCatalog,
  type CatalogSearchKind,
} from '../api/searchStores'

export type CatalogSearchParams = {
  storeNameQ: string
  storeCategories: string[]
  kinds: CatalogSearchKind[]
  km: string
  trustMin: string
  geo: { lat: number; lng: number } | null
  offset: number
  limit: number
}

export function useCatalogSearch() {
  return useMutation({
    mutationFn: (params: CatalogSearchParams) =>
      searchCatalog({
        name: params.storeNameQ.trim() || undefined,
        category: params.storeCategories.join(',') || undefined,
        kinds: params.kinds,
        km: params.km ? Number(params.km) : undefined,
        trustMin: params.trustMin ? Number(params.trustMin) : undefined,
        lat: params.geo?.lat,
        lng: params.geo?.lng,
        offset: params.offset,
        limit: params.limit,
      }),
  })
}
