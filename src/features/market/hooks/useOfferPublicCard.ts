import { useEffect, useLayoutEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useMarketStore } from '@features/market/logic/store/useMarketStore'
import { offerFromStoreCatalogs } from '@features/market/logic/offerFromCatalog'
import {
  applyPublicOfferCardToStore,
  mergePublicOfferCardIntoStore,
} from '@features/market/logic/publicOfferCardStoreSync'
import {
  mergeRouteOfferPublicFromEmergentCard,
  routeOfferPublicFromEmergentCardOffer,
} from '@features/market/logic/routeOfferPublicFromEmergentCard'
import { usePublicOfferCardQuery } from './usePublicOfferCardQuery'

function hasOfferInStore(offerId: string): boolean {
  const st = useMarketStore.getState()
  if (st.offers[offerId]) return true
  return !!offerFromStoreCatalogs(offerId, st.storeCatalogs)
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

  const needsFetch = !!offerId && !offer && !offerFromCatalog
  const cardQuery = usePublicOfferCardQuery(offerId, { enabled: needsFetch })

  const revalidateEmergent =
    !!options?.revalidateEmergent &&
    !!offerId &&
    !!(offer ?? offerFromCatalog)?.isEmergentRoutePublication &&
    !options?.isGuest &&
    !!options?.sessionReady

  const revalidateQuery = usePublicOfferCardQuery(offerId, {
    enabled: revalidateEmergent,
  })

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
    if (!cardQuery.data) return
    applyPublicOfferCardToStore(cardQuery.data)
  }, [cardQuery.data])

  useEffect(() => {
    if (cardQuery.isError) {
      const err = cardQuery.error
      toast.error(
        err instanceof Error ? err.message : 'No se pudo cargar la ficha.',
      )
    }
  }, [cardQuery.isError, cardQuery.error])

  useEffect(() => {
    if (!revalidateQuery.data) return
    mergePublicOfferCardIntoStore(revalidateQuery.data)
  }, [revalidateQuery.data])

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

  const publicCardLoadDone =
    !offerId ||
    hasOfferInStore(offerId) ||
    (!needsFetch && !cardQuery.isFetching) ||
    cardQuery.isSuccess ||
    cardQuery.isError

  return {
    offer,
    offerFromCatalog,
    resolvedOffer,
    threadCatalogId,
    publicCardLoadDone,
  }
}
