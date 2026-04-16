import type { StoreBadge } from '../../app/store/marketStoreTypes'
import type { StoreCatalog } from '../../pages/chat/domain/storeCatalogTypes'

/** Misma heurística que el feed de ofertas “de transporte”. */
export const TRANSPORT_FEED_TAG = /hoja de ruta|transporte|flete|logístic|fulfillment|cadena|para transport/i

const SERVICE_TRANSPORT_HINT =
  /transporte|logística|flete|transport|cadena|fulfillment|última milla|picking|envío|almacenaje/i

/** Oferta orientada a transportistas (tags del feed acotado). */
export function isTransportFeedOffer(offer: { tags: string[] }): boolean {
  return offer.tags.some((t) => TRANSPORT_FEED_TAG.test(t))
}

/**
 * El feed de fletes solo aplica si el usuario tiene al menos un servicio de transporte/logística
 * publicado en alguna tienda de la que es dueño (según catálogo ya cargado en cliente).
 */
export function userHasTransportService(
  userId: string,
  stores: Record<string, StoreBadge>,
  storeCatalogs: Record<string, StoreCatalog | undefined>,
): boolean {
  if (!userId || userId === 'guest') return false
  for (const [sid, b] of Object.entries(stores)) {
    if (b.ownerUserId !== userId) continue
    if (b.categories.some((c) => /transport/i.test(c))) return true
    const cat = storeCatalogs[sid]
    if (!cat?.services?.length) continue
    for (const s of cat.services) {
      if (s.published === false) continue
      if (
        SERVICE_TRANSPORT_HINT.test(s.tipoServicio) ||
        SERVICE_TRANSPORT_HINT.test(s.category)
      ) {
        return true
      }
    }
  }
  return false
}

/**
 * En una oferta de ruta / transporte, el usuario actúa como transportista solo si cumple elegibilidad
 * y la oferta es del feed de transporte (no hay rol global fuera del chat).
 */
export function userActsAsCarrierOnTransportOffer(
  userId: string,
  stores: Record<string, StoreBadge>,
  storeCatalogs: Record<string, StoreCatalog | undefined>,
  offer: { tags: string[] },
  hasRouteOffer: boolean,
): boolean {
  return (
    hasRouteOffer &&
    isTransportFeedOffer(offer) &&
    userHasTransportService(userId, stores, storeCatalogs)
  )
}
