import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useMarketStore } from '@features/market/model/store/useMarketStore'
import { offerFromStoreCatalogs } from '@features/market/api/offerFromCatalog'
import { fetchPublicOfferCard } from '@features/market/api/marketPersistence'
import {
  mergeRouteOfferPublicFromEmergentCard,
  routeOfferPublicFromEmergentCardOffer,
} from '@features/market/api/routeOfferPublicFromEmergentCard'

function hasOfferInStore(offerId: string): boolean {
  const st = useMarketStore.getState()
  if (st.offers[offerId]) return true
  return !!offerFromStoreCatalogs(offerId, st.storeCatalogs)
}

function applyPublicOfferCardToStore(r: NonNullable<Awaited<ReturnType<typeof fetchPublicOfferCard>>>) {
  const storeKey = r.store.id?.trim() || r.offer.storeId
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
      offers: { ...s.offers, [r.offer.id]: r.offer },
      stores: nextStores,
    }
  })
}

/** Carga ficha pública de oferta y sincroniza Zustand. */
export function useOfferPublicCard(
  offerId: string | undefined,
  options?: {
    revalidateEmergent?: boolean
    sessionReady?: boolean
    isGuest?: boolean
  },
) {
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs)
  const offer = useMarketStore((s) => (offerId ? s.offers[offerId] : undefined))

  const offerFromCatalog = useMemo(
    () => (offerId ? offerFromStoreCatalogs(offerId, storeCatalogs) : undefined),
    [offerId, storeCatalogs],
  )

  const [publicCardLoadDone, setPublicCardLoadDone] = useState(() =>
    !offerId ? true : hasOfferInStore(offerId),
  )

  useLayoutEffect(() => {
    if (!offerId || offer || !offerFromCatalog) return
    useMarketStore.setState((s) => {
      if (s.offers[offerId]) return s
      return {
        ...s,
        offers: { ...s.offers, [offerId]: offerFromCatalog },
      }
    })
  }, [offerId, offer, offerFromCatalog])

  useEffect(() => {
    if (!offerId) {
      setPublicCardLoadDone(false)
      return
    }
    if (offer || offerFromCatalog) {
      setPublicCardLoadDone(true)
      return
    }
    setPublicCardLoadDone(false)
    void fetchPublicOfferCard(offerId)
      .then((r) => {
        if (r) applyPublicOfferCardToStore(r)
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : 'No se pudo cargar la ficha.'
        toast.error(msg)
      })
      .finally(() => {
        setPublicCardLoadDone(true)
      })
  }, [offerId, offer, offerFromCatalog])

  const threadCatalogId = useMemo(
    () =>
      (offer?.emergentBaseOfferId?.trim() ??
        offerFromCatalog?.emergentBaseOfferId?.trim() ??
        offerId) as string | undefined,
    [offer, offerFromCatalog, offerId],
  )

  const resolvedOffer = offer ?? offerFromCatalog

  useLayoutEffect(() => {
    if (!threadCatalogId || !resolvedOffer?.isEmergentRoutePublication) return
    const built = routeOfferPublicFromEmergentCardOffer(resolvedOffer)
    if (!built) return
    useMarketStore.setState((s) => {
      const prev = s.routeOfferPublic[threadCatalogId]
      const merged = mergeRouteOfferPublicFromEmergentCard(prev, built)
      return {
        ...s,
        routeOfferPublic: {
          ...s.routeOfferPublic,
          [threadCatalogId]: merged,
        },
      }
    })
  }, [threadCatalogId, resolvedOffer])

  useEffect(() => {
    if (!options?.revalidateEmergent) return
    if (!offerId || !resolvedOffer?.isEmergentRoutePublication) return
    if (options.isGuest || !options.sessionReady) return
    let cancelled = false
    void fetchPublicOfferCard(offerId)
      .then((r) => {
        if (cancelled || !r) return
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
      })
      .catch(() => {
        /* feed puede estar desactualizado; no bloquear UI */
      })
    return () => {
      cancelled = true
    }
  }, [
    offerId,
    resolvedOffer?.isEmergentRoutePublication,
    options?.revalidateEmergent,
    options?.isGuest,
    options?.sessionReady,
  ])

  return {
    offer,
    offerFromCatalog,
    resolvedOffer,
    threadCatalogId,
    publicCardLoadDone,
  }
}
