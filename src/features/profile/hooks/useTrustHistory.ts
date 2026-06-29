import { useQuery } from '@tanstack/react-query'
import { fetchMeTrustHistory } from '../api/trustLedgerApi'
import { queryKeys } from '@shared/lib/queryKeys'

export function useTrustHistory(userId: string | undefined, enabled = false) {
  const id = userId?.trim() ?? ''
  return useQuery({
    queryKey: queryKeys.trustHistory(id),
    queryFn: () => fetchMeTrustHistory(),
    enabled: enabled && id.length > 0 && id !== 'guest',
    staleTime: 60_000,
  })
}
