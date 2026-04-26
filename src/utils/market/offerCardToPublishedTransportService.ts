import type { Offer, StoreBadge } from '../../app/store/marketStoreTypes'
import type { PublishedTransportServiceDto } from './publishedTransportServicesApi'

/** Convierte la respuesta de GET `/api/v1/market/offers/{id}/card` al DTO de ficha de servicio. */
export function offerAndStoreToPublishedTransportServiceDto(
  offer: Offer,
  store?: StoreBadge,
): PublishedTransportServiceDto {
  const raw = offer as Record<string, unknown>
  const str = (k: string) => {
    const v = raw[k]
    return typeof v === 'string' ? v.trim() : ''
  }

  const photoUrlsFromRaw = raw.photoUrls
  let photoUrls: string[] = []
  if (Array.isArray(photoUrlsFromRaw)) {
    photoUrls = photoUrlsFromRaw.filter((u): u is string => typeof u === 'string' && !!u.trim())
  }
  if (photoUrls.length === 0 && offer.imageUrls?.length) {
    photoUrls = offer.imageUrls.filter((u) => typeof u === 'string' && !!u.trim())
  } else if (photoUrls.length === 0 && offer.imageUrl?.trim()) {
    photoUrls = [offer.imageUrl.trim()]
  }

  const tipo = str('tipoServicio') || offer.title?.trim() || ''
  const cat =
    str('category') ||
    (offer.tags ?? []).find((t) => t !== 'Servicio' && t !== 'Producto') ||
    ''

  const descFromOffer = (offer.description ?? '').trim()

  return {
    id: offer.id,
    storeId: offer.storeId,
    storeName: store?.name?.trim() || undefined,
    category: cat || undefined,
    tipoServicio: tipo || undefined,
    descripcion: descFromOffer || undefined,
    incluye: str('incluye') || undefined,
    noIncluye: str('noIncluye') || undefined,
    entregables: str('entregables') || undefined,
    propIntelectual: str('propIntelectual') || undefined,
    photoUrls,
  }
}
