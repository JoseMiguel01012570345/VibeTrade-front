import type { Offer } from "@features/market/logic/store/useMarketStore";
import type { CatalogOfferPreview } from "@features/catalog/Dtos/catalogSearchTypes";

export function offerTitle(offer: CatalogOfferPreview): string {
  if (offer.kind === "emergent")
    return offer.name?.trim() || offer.category || "Hoja de ruta";
  if (offer.kind === "product")
    return offer.name?.trim() || offer.category || "Producto";
  return offer.tipoServicio?.trim() || offer.category || "Servicio";
}

export function offerSubtitle(offer: CatalogOfferPreview): string | null {
  if (offer.kind === "emergent") {
    const bits = [offer.category].filter(Boolean);
    return bits.length ? bits.join(" · ") : "Publicación de hoja de ruta";
  }
  if (offer.kind === "product") {
    const priceText =
      offer.price && offer.currency
        ? `${offer.price} ${offer.currency}`
        : offer.price || null;
    const currencyText =
      !priceText && offer.currency ? `Moneda: ${offer.currency}` : null;
    const bits = [offer.category, priceText ?? currencyText].filter(Boolean);
    return bits.length ? bits.join(" · ") : null;
  }
  const bits = [offer.category].filter(Boolean);
  return bits.length ? bits.join(" · ") : null;
}

export function emergentOfferForMap(
  preview: CatalogOfferPreview,
  storeId: string,
): Offer {
  return {
    id: preview.id,
    storeId,
    title: preview.name?.trim() || "Hoja de ruta",
    price: preview.price?.trim() || "—",
    tags: ["Hoja de ruta (publicada)"],
    imageUrl: preview.photoUrls?.[0]?.trim() || "",
    isEmergentRoutePublication: true,
    emergentRouteParadas: preview.emergentRouteParadas,
  };
}
