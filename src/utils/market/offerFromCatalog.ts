import type { Offer } from "../../app/store/marketStoreTypes";
import type { StoreCatalog } from "../../pages/chat/domain/storeCatalogTypes";
import { TOOL_PLACEHOLDER_SRC } from "./toolPlaceholder";

/** Oferta de ficha cuando el ítem está en `storeCatalogs` pero aún no en `market.offers` (p. ej. enlace desde vitrina). */
export function offerFromStoreCatalogs(
  offerId: string,
  storeCatalogs: Record<string, StoreCatalog>,
): Offer | undefined {
  for (const cat of Object.values(storeCatalogs)) {
    const p = cat.products.find((x) => x.id === offerId);
    if (p) {
      const catLabel = p.category.trim();
      const tags = catLabel ? [catLabel] : ["Producto"];
      return {
        id: p.id,
        storeId: p.storeId,
        title: p.name.trim() || p.category || "Producto",
        price: p.price,
        description: p.shortDescription,
        tags,
        imageUrl: p.photoUrls[0]?.trim() || "",
        imageUrls: p.photoUrls.map((u) => String(u).trim()).filter(Boolean),
      };
    }
    const s = cat.services.find((x) => x.id === offerId);
    if (s) {
      const catLabel = s.category.trim();
      const tags = ["Servicio", ...(catLabel ? [catLabel] : [])];
      const urls = (s.photoUrls ?? [])
        .map((u) => String(u).trim())
        .filter(Boolean);
      return {
        id: s.id,
        storeId: s.storeId,
        title: s.tipoServicio.trim() || s.category || "Servicio",
        price: "",
        description: s.descripcion,
        tags,
        imageUrl: urls[0] || TOOL_PLACEHOLDER_SRC,
        imageUrls: urls,
      };
    }
  }
  return undefined;
}
