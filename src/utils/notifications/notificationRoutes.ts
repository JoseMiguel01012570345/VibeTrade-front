import type { NotificationItem } from '../../app/store/useAppStore'

/** Ruta interna de la SPA para abrir desde una notificación del sistema. */
export function notificationDeepLink(
  n: Pick<NotificationItem, 'kind' | 'threadId' | 'offerId'>,
): string | null {
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
