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
  >,
): string | null {
  if (n.kind === 'route_tramo_subscribe_accepted' && n.threadId) {
    return `/chat/${encodeURIComponent(n.threadId)}`
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
