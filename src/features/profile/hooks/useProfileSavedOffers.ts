import { useEffect, useMemo } from 'react'
import type { Offer } from '@features/market/model/store/marketStoreTypes'
import { useAppStore } from '@features/auth/model/useAppStore'
import { useMarketStore } from '@features/market/model/store/useMarketStore'
import { fetchPublicOfferCard } from '@features/market/api/marketPersistence'

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

  const savedOfferIdsKey = useMemo(
    () => savedOfferIds.slice().sort().join('\u0000'),
    [savedOfferIds],
  )

  useEffect(() => {
    if (!active) return
    const ids = Object.keys(useAppStore.getState().savedOffers).filter(
      (i) => useAppStore.getState().savedOffers[i],
    )
    if (ids.length === 0) return
    const missing = ids.filter((id) => !useMarketStore.getState().offers[id])
    if (missing.length === 0) return
    let cancelled = false
    void (async () => {
      for (const id of missing) {
        if (cancelled) return
        try {
          const r = await fetchPublicOfferCard(id)
          if (!r || cancelled) continue
          const storeKey = r.store.id?.trim() || r.offer.storeId
          const merged: Offer = { ...r.offer, id }
          useMarketStore.setState((s) => {
            if (s.offers[id]) return s
            const nextStores = { ...s.stores }
            if (storeKey) {
              nextStores[storeKey] = {
                ...s.stores[storeKey],
                ...r.store,
                id: storeKey,
              }
            }
            return {
              ...s,
              offers: { ...s.offers, [id]: merged },
              stores: nextStores,
            }
          })
        } catch {
          /* offline / 404 */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [active, savedOfferIdsKey])

  return { savedOfferIds, savedOfferItems }
}
