import type {
  MarketState,
  RouteOfferPublicState,
  RouteOfferTramoPublic,
  Thread,
} from '../../../app/store/marketStoreTypes'
import { threadHasAcceptedAgreement } from '../../../app/store/marketStoreTypes'
import type { RouteSheet, RouteStop } from './routeSheetTypes'

/** Mensaje cuando el comprador del hilo intenta suscribirse como transportista a la misma hoja publicada. */
export const ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES =
  'No podés suscribirte como transportista: en esta operación sos el comprador con un acuerdo aceptado.'

/** Prioridad: teléfono en la parada de la hoja → asignación en la oferta → campo público del tramo. */
export function effectiveTramoContactPhone(
  stop: RouteStop,
  offerTramo?: RouteOfferTramoPublic | null,
): string | undefined {
  const h = stop.telefonoTransportista?.trim()
  if (h) return h
  const fromAssign = offerTramo?.assignment?.phone?.trim()
  if (fromAssign) return fromAssign
  const fromPublic = offerTramo?.telefonoTransportista?.trim()
  if (fromPublic) return fromPublic
  return undefined
}

/** Texto compacto para listados (preview): teléfonos por tramo en orden. */
export function sheetPreviewContactLine(
  sheet: RouteSheet,
  routeOffer: RouteOfferPublicState | undefined,
): string | null {
  const parts: string[] = []
  for (const p of sheet.paradas) {
    const ot =
      routeOffer?.routeSheetId === sheet.id ?
        routeOffer.tramos.find((t) => t.stopId === p.id)
      : undefined
    const tel = effectiveTramoContactPhone(p, ot)
    if (tel) parts.push(tel)
  }
  return parts.length ? parts.join(' · ') : null
}

/** True si la oferta pública está ligada a esta hoja y algún tramo ya tiene transportista confirmado. */
export function routeSheetHasConfirmedCarriersOnOffer(
  offer: RouteOfferPublicState | undefined,
  sheetId: string,
): boolean {
  return (
    offer?.routeSheetId === sheetId &&
    (offer.tramos?.some((t) => t.assignment?.status === 'confirmed') ?? false)
  )
}

/** Tras borrar un acuerdo quedarían `contracts.length - 1` acuerdos; las hojas no pueden superar ese número. */
export function agreementDeleteBlockedByRouteSheetInvariant(
  contractCount: number,
  routeSheetCount: number,
): boolean {
  if (contractCount === 0) return routeSheetCount > 0
  return routeSheetCount > contractCount - 1
}

/** Tramos de la oferta con asignación confirmada para el transportista. */
export function confirmedStopIdsForCarrier(
  ro: RouteOfferPublicState | undefined,
  userId: string,
): Set<string> {
  const out = new Set<string>()
  if (!ro) return out
  for (const t of ro.tramos) {
    if (t.assignment?.userId === userId && t.assignment.status === 'confirmed') out.add(t.stopId)
  }
  return out
}

export function tramoNotifyLineFromOffer(ro: RouteOfferPublicState | undefined, stopId: string): string {
  const t = ro?.tramos.find((x) => x.stopId === stopId)
  if (!t) return 'un tramo nuevo'
  return `Tramo ${t.orden} (${t.origenLine} → ${t.destinoLine})`
}

/**
 * True si el usuario no debe poder suscribirse como transportista a esta oferta pública de ruta:
 * está vinculada al hilo donde es comprador y ya hay acuerdo aceptado.
 */
export function routeOfferPublicBlockedForBuyerWithAgreement(
  routeOffer: RouteOfferPublicState | undefined,
  threads: Record<string, Thread>,
  viewerId: string,
): boolean {
  const tid = routeOffer?.threadId?.trim()
  if (!tid || !viewerId || viewerId === 'guest') return false
  const th = threads[tid]
  if (!th) return false
  if (th.buyerUserId !== viewerId) return false
  return threadHasAcceptedAgreement(th)
}

/**
 * `routeOfferPublic` suele estar bajo el id de catálogo; el hilo puede tener `offerId` = publicación `emo_*`.
 * Resuelve la entrada correcta para el panel de suscriptores, bloqueo de transportista, etc.
 */
export function resolveRouteOfferPublicForThread(
  state: Pick<MarketState, 'threads' | 'routeOfferPublic' | 'offers'>,
  thread: Thread | undefined,
): RouteOfferPublicState | undefined {
  if (!thread) return undefined
  const direct = state.routeOfferPublic[thread.offerId]
  if (direct) return direct
  const offer = state.offers[thread.offerId]
  const base = offer?.emergentBaseOfferId?.trim()
  if (base) {
    const fromBase = state.routeOfferPublic[base]
    if (fromBase) return fromBase
  }
  for (const ro of Object.values(state.routeOfferPublic)) {
    if (ro.threadId === thread.id) return ro
  }
  return undefined
}
