import type {
  RouteOfferPublicState,
  RouteOfferTramoPublic,
} from '../../../app/store/marketStoreTypes'
import type { RouteSheet, RouteStop } from './routeSheetTypes'

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
