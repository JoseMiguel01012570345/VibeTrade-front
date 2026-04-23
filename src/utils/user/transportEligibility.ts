import type { StoreBadge } from '../../app/store/marketStoreTypes'
import type { StoreCatalog, StoreService } from '../../pages/chat/domain/storeCatalogTypes'

/** Misma heurística que el feed de ofertas “de transporte”. */
export const TRANSPORT_FEED_TAG = /hoja de ruta|transporte|flete|logístic|fulfillment|cadena|para transport/i

const SERVICE_TRANSPORT_HINT =
  /transporte|logística|logistica|flete|transport|cadena|fulfillment|última milla|picking|envío|almacenaje/i

/**
 * Categorías de tienda / servicio alineadas al catálogo (p. ej. «Transportista», «Logística»).
 * «Logística» no coincide con /transport/; hace falta matchear explícito.
 */
const TRANSPORT_TAXONOMY_RE =
  /transportista|log[ií]stica|logistica|transporte|flete|fulfillment|cadena|envío|envio|última milla|ultima milla/i

function storeCategoriesImplyTransport(categories: string[]): boolean {
  return categories.some((c) => {
    const t = c.trim()
    return t.length > 0 && TRANSPORT_TAXONOMY_RE.test(t)
  })
}

/** Servicio publicado que califica como oferta de transporte / logística. */
export function serviceQualifiesAsTransport(s: StoreService): boolean {
  if (s.published === false) return false
  const tipo = (s.tipoServicio ?? '').trim()
  const cat = (s.category ?? '').trim()
  if (cat.length > 0 && TRANSPORT_TAXONOMY_RE.test(cat)) return true
  if (tipo.length > 0 && SERVICE_TRANSPORT_HINT.test(tipo)) return true
  if (cat.length > 0 && SERVICE_TRANSPORT_HINT.test(cat)) return true
  return false
}

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
    if (storeCategoriesImplyTransport(b.categories)) return true
    const cat = storeCatalogs[sid]
    if (!cat?.services?.length) continue
    for (const s of cat.services) {
      if (serviceQualifiesAsTransport(s)) return true
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

export type UserTransportServiceOption = {
  storeId: string;
  serviceId: string;
  /** Texto para referencia en suscripción (demo). */
  label: string;
};

/**
 * Servicios publicados del usuario que califican como transporte/logística (mismo criterio que el feed).
 */
export function listUserTransportServices(
  userId: string,
  stores: Record<string, StoreBadge>,
  storeCatalogs: Record<string, StoreCatalog | undefined>,
): UserTransportServiceOption[] {
  const out: UserTransportServiceOption[] = []
  if (!userId || userId === 'guest') return out
  for (const [sid, b] of Object.entries(stores)) {
    if (b.ownerUserId !== userId) continue
    const cat = storeCatalogs[sid]
    if (!cat?.services?.length) continue
    for (const s of cat.services) {
      if (!serviceQualifiesAsTransport(s)) continue
      const label = [s.tipoServicio, s.category].filter((x) => x?.trim()).join(' · ') || 'Servicio de transporte'
      out.push({ storeId: sid, serviceId: s.id, label })
    }
  }
  return out
}
