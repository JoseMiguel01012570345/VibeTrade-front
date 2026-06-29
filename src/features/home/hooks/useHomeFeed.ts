import { useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { fetchRecommendationPage } from '../api/recommendationsApi'
import type { RecommendationBatch } from '@app/bootstrap/bootstrapTypes'

export function useHomeFeedBatch() {
  return useMutation({
    mutationFn: (take: number) => fetchRecommendationPage(take),
  })
}

export function useHomeFeedLoader() {
  const mutation = useHomeFeedBatch()
  const loadNext = useCallback(
    async (take: number): Promise<RecommendationBatch | null> => {
      try {
        return await mutation.mutateAsync(take)
      } catch {
        return null
      }
    },
    [mutation],
  )
  return { loadNext, isLoading: mutation.isPending }
}
