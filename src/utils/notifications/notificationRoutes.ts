import type { NotificationItem } from '../../app/store/useAppStore'

/** Ruta interna de la SPA para abrir desde una notificación del sistema. */
export function notificationDeepLink(
  n: Pick<
    NotificationItem,
    | 'kind'
    | 'threadId'
    | 'offerId'
    | 'routeSheetId'
    | 'highlightCarrierUserId'
    | 'stopId'
    | 'preselStopIds'
    | 'storeServiceId'
  >,
): string | null {
  if (n.kind === 'route_tramo_subscribe_accepted' && n.threadId) {
    const sheet = n.routeSheetId?.trim()
    const hi = n.highlightCarrierUserId?.trim()
    if (sheet && hi) {
      const q = new URLSearchParams({ subs: '1', sheet, hi })
      return `/chat/${encodeURIComponent(n.threadId)}?${q.toString()}`
    }
    return `/chat/${encodeURIComponent(n.threadId)}`
  }
  if (n.kind === 'route_tramo_subscribe_rejected' && n.offerId) {
    return `/offer/${encodeURIComponent(n.offerId)}`
  }
  if (n.kind === 'route_tramo_seller_expelled' && n.offerId) {
    return `/offer/${encodeURIComponent(n.offerId)}`
  }
  if (n.kind === 'route_tramo_seller_expelled' && n.threadId) {
    return `/chat/${encodeURIComponent(n.threadId)}`
  }
  if (n.kind === 'route_sheet_presel' && n.threadId) {
    const sheet = n.routeSheetId?.trim()
    if (sheet) {
      const q = new URLSearchParams({ sheet })
      const stops =
        n.preselStopIds?.length ?
          n.preselStopIds.join(',')
        : n.stopId?.trim() ?
          n.stopId.trim()
        : ''
      if (stops) q.set('stops', stops)
      return `/invite/presel/${encodeURIComponent(n.threadId)}?${q.toString()}`
    }
    return `/chat/${encodeURIComponent(n.threadId)}`
  }
  if (n.kind === 'route_sheet_presel_decl' && n.threadId) {
    return `/chat/${encodeURIComponent(n.threadId)}`
  }
  if (n.kind === 'store_trust_penalty' && n.threadId) {
    return `/chat/${encodeURIComponent(n.threadId)}`
  }
  if (n.kind === 'store_trust_penalty' && n.offerId) {
    return `/offer/${encodeURIComponent(n.offerId)}`
  }
  if (
    n.kind === 'route_tramo_subscribe' &&
    n.threadId &&
    n.routeSheetId &&
    n.highlightCarrierUserId
  ) {
    const q = new URLSearchParams({
      subs: '1',
      sheet: n.routeSheetId,
      hi: n.highlightCarrierUserId,
    })
    return `/chat/${encodeURIComponent(n.threadId)}?${q.toString()}`
  }
  if (
    (n.kind === 'offer_comment' ||
      n.kind === 'offer_like' ||
      n.kind === 'qa_comment_like') &&
    n.offerId
  ) {
    return `/offer/${encodeURIComponent(n.offerId)}#offer-comments`
  }
  if (n.threadId) {
    return `/chat/${encodeURIComponent(n.threadId)}`
  }
  if (n.offerId) {
    return `/offer/${encodeURIComponent(n.offerId)}#offer-comments`
  }
  return null
}
