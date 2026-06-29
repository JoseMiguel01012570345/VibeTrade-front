import { useEffect, useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import type { Offer } from '@features/market/logic/store/marketStoreTypes'
import { useAppStore } from '@features/auth/logic/useAppStore'
import { useMarketStore } from '@features/market/logic/store/useMarketStore'
import { fetchPublicOfferCard } from '@features/market/api/marketPersistence'
import { queryKeys } from '@shared/lib/queryKeys'
import { applyPublicOfferCardToStore } from '@features/market/logic/publicOfferCardStoreSync'

export function useProfileSavedOffers(active: boolean) {
  const savedOffers = useAppStore((s) => s.savedOffers)
  const offers = useMarketStore((s) => s.offers)

  const savedOfferIds = useMemo(
    () => Object.keys(savedOffers).filter((id) => savedOffers[id]),
    [savedOffers],
  )

  const savedOfferItems = useMemo((): Offer[] => {
    const list = savedOfferIds
      .map((id) => offers[id])
      .filter((o): o is Offer => o != null)
    return [...list].sort((a, b) =>
      a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }),
    )
  }, [savedOfferIds, offers])

  const missingIds = useMemo(
    () =>
      active
        ? savedOfferIds.filter((id) => !useMarketStore.getState().offers[id])
        : [],
    [active, savedOfferIds, offers],
  )

  const cardQueries = useQueries({
    queries: missingIds.map((id) => ({
      queryKey: queryKeys.publicOfferCard(id),
      queryFn: () => fetchPublicOfferCard(id),
      enabled: active && missingIds.includes(id),
      staleTime: 30_000,
    })),
  })

  useEffect(() => {
    for (const q of cardQueries) {
      if (q.data) applyPublicOfferCardToStore(q.data)
    }
  }, [cardQueries])

  return { savedOfferIds, savedOfferItems }
}
