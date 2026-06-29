import { useQuery } from '@tanstack/react-query'
import { fetchCatalogCategories } from '../api/fetchCatalogCategories'

export const catalogCategoriesQueryKey = ['catalog-categories'] as const

export function useCatalogCategories() {
  return useQuery({
    queryKey: catalogCategoriesQueryKey,
    queryFn: fetchCatalogCategories,
    staleTime: 60_000,
  })
}
