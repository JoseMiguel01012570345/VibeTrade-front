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
  | 'routeSheetId'
  | 'stopId'
  | 'highlightCarrierUserId'
  | 'preselStopIds'
  | 'storeServiceId'
> {
  if (!metaJson?.trim()) return {}
  try {
    const j = JSON.parse(metaJson) as Record<string, unknown>
    const routeSheetIdRaw =
      typeof j.routeSheetId === 'string' ?
        j.routeSheetId
      : typeof j.RouteSheetId === 'string' ? j.RouteSheetId
      : undefined
    const routeSheetId = routeSheetIdRaw?.trim() || undefined
    const stopIdRaw =
      typeof j.stopId === 'string' ? j.stopId
      : typeof j.StopId === 'string' ? j.StopId
      : undefined
    let stopId = stopIdRaw?.trim() || undefined
    const carrierUserIdRaw =
      typeof j.carrierUserId === 'string' ? j.carrierUserId
      : typeof j.CarrierUserId === 'string' ? j.CarrierUserId
      : undefined
    const carrierUserId = carrierUserIdRaw?.trim() || undefined

    let storeServiceId: string | undefined
    const stopsArr = j.stops ?? j.Stops
    if (Array.isArray(stopsArr)) {
      for (const el of stopsArr) {
        if (!el || typeof el !== 'object') continue
        const o = el as Record<string, unknown>
        const sid =
          typeof o.stopId === 'string' ? o.stopId.trim()
          : typeof o.StopId === 'string' ? o.StopId.trim()
          : ''
        const svc =
          typeof o.storeServiceId === 'string' ? o.storeServiceId.trim()
          : typeof o.StoreServiceId === 'string' ? o.StoreServiceId.trim()
          : ''
        if (!stopId && sid) stopId = sid
        if (!storeServiceId && svc) storeServiceId = svc
      }
    }

    let preselStopIds: string[] | undefined
    const preselRaw = j.stopIds ?? j.StopIds
    if (Array.isArray(preselRaw) && preselRaw.every((x) => typeof x === 'string')) {
      preselStopIds = (preselRaw as string[])
        .map((s) => s.trim())
        .filter(Boolean)
      if (preselStopIds.length === 0) preselStopIds = undefined
    }

    const storeServiceIdRoot =
      typeof j.storeServiceId === 'string' ? j.storeServiceId.trim()
      : typeof j.StoreServiceId === 'string' ? j.StoreServiceId.trim()
      : ''
    if (!storeServiceId && storeServiceIdRoot) storeServiceId = storeServiceIdRoot

    return {
      ...(routeSheetId ? { routeSheetId } : {}),
      ...(stopId ? { stopId } : {}),
      ...(carrierUserId ? { highlightCarrierUserId: carrierUserId } : {}),
      ...(preselStopIds ? { preselStopIds } : {}),
      ...(storeServiceId ? { storeServiceId } : {}),
    }
  } catch {
    return {}
  }
}

export function mapServerNotification(n: ChatNotificationDto): NotificationItem {
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
    const meta = parseRouteTramoMeta(n.metaJson)
    return {
      id: n.id,
      kind: 'route_tramo_subscribe_accepted',
      title: `${n.authorLabel} · confianza ${n.authorTrustScore}`,
      body: n.messagePreview,
      createdAt: Date.parse(n.createdAtUtc),
      read: n.readAtUtc != null,
      threadId: n.threadId,
      trustScore: n.authorTrustScore,
      ...meta,
    }
  }

  if (n.kind === 'route_tramo_subscribe_rejected' && n.threadId) {
    const oid = n.offerId?.trim()
    return {
      id: n.id,
      kind: 'route_tramo_subscribe_rejected',
      title: `${n.authorLabel} · confianza ${n.authorTrustScore}`,
      body: n.messagePreview,
      createdAt: Date.parse(n.createdAtUtc),
      read: n.readAtUtc != null,
      threadId: n.threadId,
      ...(oid ? { offerId: oid } : {}),
      trustScore: n.authorTrustScore,
    }
  }

  if (n.kind === 'route_tramo_seller_expelled' && n.threadId) {
    const oid = n.offerId?.trim()
    return {
      id: n.id,
      kind: 'route_tramo_seller_expelled',
      title: 'Te retiraron de la operación',
      body: n.messagePreview,
      createdAt: Date.parse(n.createdAtUtc),
      read: n.readAtUtc != null,
      threadId: n.threadId,
      ...(oid ? { offerId: oid } : {}),
      trustScore: n.authorTrustScore,
    }
  }

  if (n.kind === 'peer_party_exited' && n.threadId) {
    return {
      id: n.id,
      kind: 'peer_party_exited',
      title: 'Salida del chat (acuerdo aceptado)',
      body: n.messagePreview,
      createdAt: Date.parse(n.createdAtUtc),
      read: n.readAtUtc != null,
      threadId: n.threadId,
      trustScore: n.authorTrustScore,
    }
  }

  if (n.kind === 'route_sheet_presel' && n.threadId) {
    const meta = parseRouteTramoMeta(n.metaJson)
    const oid = n.offerId?.trim()
    return {
      id: n.id,
      kind: 'route_sheet_presel',
      title: `${n.authorLabel} · confianza ${n.authorTrustScore}`,
      body: n.messagePreview,
      createdAt: Date.parse(n.createdAtUtc),
      read: n.readAtUtc != null,
      threadId: n.threadId,
      ...(oid ? { offerId: oid } : {}),
      trustScore: n.authorTrustScore,
      ...meta,
    }
  }

  if (n.kind === 'route_sheet_presel_decl' && n.threadId) {
    const meta = parseRouteTramoMeta(n.metaJson)
    const oid = n.offerId?.trim()
    return {
      id: n.id,
      kind: 'route_sheet_presel_decl',
      title: 'Invitación a transportista',
      body: n.messagePreview,
      createdAt: Date.parse(n.createdAtUtc),
      read: n.readAtUtc != null,
      threadId: n.threadId,
      ...(oid ? { offerId: oid } : {}),
      trustScore: n.authorTrustScore,
      ...meta,
    }
  }

  if (n.kind === 'store_trust_penalty') {
    const tid = n.threadId?.trim()
    const oid = n.offerId?.trim()
    return {
      id: n.id,
      kind: 'store_trust_penalty',
      title: 'Confianza de tu tienda',
      body: n.messagePreview,
      createdAt: Date.parse(n.createdAtUtc),
      read: n.readAtUtc != null,
      trustScore: n.authorTrustScore,
      ...(tid ? { threadId: tid } : {}),
      ...(oid ? { offerId: oid } : {}),
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
