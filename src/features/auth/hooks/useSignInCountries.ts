import { useQuery } from '@tanstack/react-query'
import { fetchSignInCountries } from '@shared/services/http/fetchSignInCountries'
import { queryKeys } from '@shared/lib/queryKeys'

export function useSignInCountries() {
  return useQuery({
    queryKey: queryKeys.signInCountries,
    queryFn: fetchSignInCountries,
    staleTime: 10 * 60_000,
  })
}
