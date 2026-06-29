import { useMemo } from 'react'
import type { Thread } from '@features/market/model/store/useMarketStore'
import { useMarketStore } from '@features/market/model/store/useMarketStore'
import { type RouteSheet } from '@features/chat/model/routeSheetTypes'
import { routeSheetAllowsCarrierContactEditWhenPaid } from '@features/chat/model/routeSheetOfferGuards'
import type { RouteOfferPublicState } from '@features/market/model/store/marketStoreTypes'
import {
  routeOfferPublicFromEmergentCardOffer,
  routeOfferPublicFromThreadRouteSheet,
} from '@features/market/api/routeOfferPublicFromEmergentCard'
import { rebuildRouteOfferAssignmentsFromThreadItems } from '@features/chat/model/routeOfferSubscriptionMerge'
import { resolveRouteOfferPublicForSheet } from '@features/chat/model/routeSheetOfferGuards'
import { resolveRouteLegPaymentCurrencyForThread } from '@features/chat/model/merchandiseRouteCurrency'

export function useChatPageRouteSheetForm(
  thread: Thread | undefined,
  routeSheetBeingEdited: RouteSheet | null,
  routeOfferForThisThread: RouteOfferPublicState | undefined,
) {
  const routeOfferPublicSlice = useMarketStore((s) => s.routeOfferPublic)
  const marketOffersSlice = useMarketStore((s) => s.offers)

  const routeOfferForEditingRouteSheet = useMemo(() => {
    const rsid = routeSheetBeingEdited?.id?.trim()
    const th = thread
    const s = useMarketStore.getState()
    const fromResolve = resolveRouteOfferPublicForSheet(
      s,
      th,
      routeSheetBeingEdited?.id,
    )
    if (fromResolve) {
      const subs = th?.routeTramoSubscriptionsSnapshot
      if (subs?.length) {
        return (
          rebuildRouteOfferAssignmentsFromThreadItems(fromResolve, subs) ??
          fromResolve
        )
      }
      return fromResolve
    }
    if (!th?.id || !rsid) return undefined
    const emo = th.offerId?.trim()
    if (emo) {
      const atKey = s.routeOfferPublic[emo]
      if (atKey?.routeSheetId?.trim() === rsid) return atKey
    }
    if (!th.offerId || !rsid) return undefined
    const offer = s.offers[th.offerId]
    const fromCard = offer
      ? routeOfferPublicFromEmergentCardOffer(offer)
      : undefined
    if (
      fromCard?.routeSheetId?.trim() === rsid &&
      fromCard.threadId?.trim() === th.id.trim()
    ) {
      return fromCard
    }
    if (routeSheetBeingEdited?.paradas?.length) {
      const synthetic = routeOfferPublicFromThreadRouteSheet(
        th.id,
        routeSheetBeingEdited,
      )
      const subs = th.routeTramoSubscriptionsSnapshot
      if (subs?.length) {
        return (
          rebuildRouteOfferAssignmentsFromThreadItems(synthetic, subs) ??
          synthetic
        )
      }
      return synthetic
    }
    return undefined
  }, [
    thread,
    routeSheetBeingEdited?.id,
    routeSheetBeingEdited,
    routeOfferPublicSlice,
    marketOffersSlice,
  ])

  const routeSheetLockedByPaidAgreement = useMemo(() => {
    const rs = routeSheetBeingEdited
    if (!rs?.id) return false
    return (thread?.contracts ?? []).some(
      (c) => c.routeSheetId === rs.id && c.hasSucceededPayments === true,
    )
  }, [thread?.contracts, routeSheetBeingEdited?.id])

  const routeSheetCarrierContactEditOnly = useMemo(() => {
    const rs = routeSheetBeingEdited
    if (!rs?.id || !routeSheetLockedByPaidAgreement) return false
    return routeSheetAllowsCarrierContactEditWhenPaid(
      true,
      routeOfferForEditingRouteSheet ?? routeOfferForThisThread,
      rs.id,
      routeSheetBeingEdited ?? undefined,
      thread?.routeTramoSubscriptionsSnapshot,
    )
  }, [
    routeSheetBeingEdited?.id,
    routeSheetLockedByPaidAgreement,
    routeSheetBeingEdited,
    routeOfferForEditingRouteSheet,
    routeOfferForThisThread,
    thread?.routeTramoSubscriptionsSnapshot,
  ])

  const routeLegPaymentCurrency = useMemo(
    () =>
      resolveRouteLegPaymentCurrencyForThread(
        thread?.contracts ?? [],
        routeSheetBeingEdited?.id,
      ),
    [thread?.contracts, routeSheetBeingEdited?.id],
  )

  return {
    routeOfferForEditingRouteSheet,
    routeSheetLockedByPaidAgreement,
    routeSheetCarrierContactEditOnly,
    routeLegPaymentCurrency,
  }
}
