import type { Offer } from "../../app/store/marketStoreTypes";
import type { StoreCatalog } from "../../pages/chat/domain/storeCatalogTypes";

const NOT_PUBLISHED_TOAST_ES =
  "Esta oferta no está publicada. No puedes iniciar un chat.";

export { NOT_PUBLISHED_TOAST_ES };

/**
 * Indica si el ítem de catálogo vinculado a la oferta está publicado en la vitrina.
 * Si no hay catálogo en memoria o no aparece el ítem, devuelve true (el servidor valida al crear el hilo).
 */
export function isOfferPublishedForBuyerChat(
  offer: Offer,
  storeCatalogs: Partial<Record<string, StoreCatalog>>,
): boolean {
  const cat = storeCatalogs[offer.storeId];
  if (!cat) return true;

  const catalogOfferId = (offer.emergentBaseOfferId?.trim() || offer.id).trim();
  if (!catalogOfferId) return true;

  const product = cat.products.find((p) => p.id === catalogOfferId);
  if (product) return product.published === true;

  const service = cat.services.find((s) => s.id === catalogOfferId);
  if (service) return service.published !== false;

  return true;
}
