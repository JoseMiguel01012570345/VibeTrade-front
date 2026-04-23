import { useAppStore, type NotificationItem } from '../../app/store/useAppStore'
import { fetchChatNotifications, type ChatNotificationDto } from '../chat/chatApi'
import { getSessionToken } from '../http/sessionToken'

type OfferNotifKind = 'offer_comment' | 'offer_like' | 'qa_comment_like'

function mapOfferNotificationKind(k: string | null | undefined): OfferNotifKind {
  if (k === 'offer_like') return 'offer_like'
  if (k === 'qa_comment_like') return 'qa_comment_like'
  return 'offer_comment'
}

function parseRouteTramoMeta(metaJson: string | null | undefined): Pick<
  NotificationItem,
  'routeSheetId' | 'stopId' | 'highlightCarrierUserId'
> {
  if (!metaJson?.trim()) return {}
  try {
    const j = JSON.parse(metaJson) as Record<string, unknown>
    const routeSheetId = typeof j.routeSheetId === 'string' ? j.routeSheetId : undefined
    const stopId = typeof j.stopId === 'string' ? j.stopId : undefined
    const carrierUserId = typeof j.carrierUserId === 'string' ? j.carrierUserId : undefined
    return {
      ...(routeSheetId ? { routeSheetId } : {}),
      ...(stopId ? { stopId } : {}),
      ...(carrierUserId ? { highlightCarrierUserId: carrierUserId } : {}),
    }
  } catch {
    return {}
  }
}

function mapServerNotification(n: ChatNotificationDto): NotificationItem {
  if (n.kind === 'route_tramo_subscribe' && n.threadId) {
    const meta = parseRouteTramoMeta(n.metaJson)
    return {
      id: n.id,
      kind: 'route_tramo_subscribe',
      title: `${n.authorLabel} · confianza ${n.authorTrustScore}`,
      body: n.messagePreview,
      createdAt: Date.parse(n.createdAtUtc),
      read: n.readAtUtc != null,
      threadId: n.threadId,
      trustScore: n.authorTrustScore,
      ...meta,
    }
  }

  if (n.kind === 'route_tramo_subscribe_accepted' && n.threadId) {
    return {
      id: n.id,
      kind: 'route_tramo_subscribe_accepted',
      title: `${n.authorLabel} · confianza ${n.authorTrustScore}`,
      body: n.messagePreview,
      createdAt: Date.parse(n.createdAtUtc),
      read: n.readAtUtc != null,
      threadId: n.threadId,
      trustScore: n.authorTrustScore,
    }
  }

  const isOfferOnly = Boolean(n.offerId && !n.threadId)
  const kind = isOfferOnly
    ? mapOfferNotificationKind(n.kind)
    : ('chat_message' as const)
  return {
    id: n.id,
    kind,
    title: `${n.authorLabel} · confianza ${n.authorTrustScore}`,
    body: n.messagePreview,
    createdAt: Date.parse(n.createdAtUtc),
    read: n.readAtUtc != null,
    ...(n.threadId ? { threadId: n.threadId } : {}),
    ...(n.offerId ? { offerId: n.offerId } : {}),
    trustScore: n.authorTrustScore,
  }
}

export async function syncChatNotificationsFromServer(): Promise<void> {
  if (!getSessionToken()) return
  try {
    const list = await fetchChatNotifications()
    const items = list.map(mapServerNotification)
    useAppStore.getState().setChatNotificationsFromServer(items)
  } catch {
    /* offline / 401 */
  }
}
