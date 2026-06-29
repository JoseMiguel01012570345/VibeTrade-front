import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSetupIntent,
  getPaymentGatewayConfig,
  listSavedCards,
} from '../api/paymentGatewayApi'
import { queryClient } from '@shared/lib/queryClient'
import { queryKeys } from '@shared/lib/queryKeys'

export function usePaymentGatewayConfig(enabled = true) {
  return useQuery({
    queryKey: queryKeys.paymentGatewayConfig,
    queryFn: getPaymentGatewayConfig,
    enabled,
    staleTime: 30_000,
  })
}

export function useSavedCards(options?: { enabled?: boolean }) {
  const configQ = usePaymentGatewayConfig(options?.enabled ?? true)
  return useQuery({
    queryKey: queryKeys.savedCards,
    queryFn: listSavedCards,
    enabled:
      (options?.enabled ?? true) &&
      configQ.isSuccess &&
      configQ.data.enabled === true,
    staleTime: 15_000,
  })
}

export async function fetchPaymentGatewayConfigCached() {
  return queryClient.fetchQuery({
    queryKey: queryKeys.paymentGatewayConfig,
    queryFn: getPaymentGatewayConfig,
    staleTime: 30_000,
  })
}

export async function fetchSavedCardsCached() {
  const cfg = await fetchPaymentGatewayConfigCached()
  if (!cfg.enabled) return []
  return queryClient.fetchQuery({
    queryKey: queryKeys.savedCards,
    queryFn: listSavedCards,
    staleTime: 15_000,
  })
}

export function useCreateSetupIntentMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSetupIntent,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.savedCards })
    },
  })
}
