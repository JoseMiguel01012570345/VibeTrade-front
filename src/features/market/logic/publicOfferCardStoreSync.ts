import type { PublicOfferCardResponse } from '@features/market/Dtos/marketPersistenceTypes'
import { useMarketStore } from '@features/market/logic/store/useMarketStore'
import type { Offer } from '@features/market/logic/store/marketStoreTypes'

export function applyPublicOfferCardToStore(
  r: NonNullable<PublicOfferCardResponse>,
  offerIdOverride?: string,
) {
  const storeKey = r.store.id?.trim() || r.offer.storeId
  const offerId = offerIdOverride?.trim() || r.offer.id
  const merged: Offer = offerIdOverride
    ? { ...r.offer, id: offerId }
    : r.offer
  useMarketStore.setState((s) => {
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
      offers: { ...s.offers, [merged.id]: merged },
      stores: nextStores,
    }
  })
}

export function mergePublicOfferCardIntoStore(
  r: NonNullable<PublicOfferCardResponse>,
) {
  const storeKey = r.store.id?.trim() || r.offer.storeId
  useMarketStore.setState((s) => {
    const prevOf = s.offers[r.offer.id] ?? r.offer
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
      offers: {
        ...s.offers,
        [r.offer.id]: { ...prevOf, ...r.offer },
      },
      stores: nextStores,
    }
  })
}
