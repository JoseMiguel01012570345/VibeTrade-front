import { useQuery } from '@tanstack/react-query'
import { fetchCatalogCategories } from '../api/fetchCatalogCategories'
import { queryKeys } from '@shared/lib/queryKeys'

export const catalogCategoriesQueryKey = queryKeys.catalogCategories

export function useCatalogCategories(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.catalogCategories,
    queryFn: fetchCatalogCategories,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  })
}
