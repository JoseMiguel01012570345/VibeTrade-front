import { useQuery } from '@tanstack/react-query'
import { fetchCurrencies } from '../api/fetchCurrencies'
import { queryKeys } from '@shared/lib/queryKeys'

export function useCurrencies(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.currencies,
    queryFn: fetchCurrencies,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  })
}
