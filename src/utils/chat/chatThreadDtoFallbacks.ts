import type { Offer, StoreBadge } from "../../app/store/marketStoreTypes";
import type { ChatThreadDto } from "./chatApi";

/** Si la ficha pública no está en el store, el hilo sigue accesible vía API (p. ej. transportista aceptado). */
export function minimalOfferStoreFromChatThreadDto(dto: ChatThreadDto): {
  offer: Offer;
  store: StoreBadge;
} {
  const sid = dto.storeId?.trim() || "";
  const oid = dto.offerId?.trim() || "";
  return {
    offer: {
      id: oid,
      storeId: sid,
      title: "Oferta del chat",
      price: "—",
      tags: [],
      imageUrl: "",
    },
    store: {
      id: sid,
      name: "Tienda",
      verified: false,
      categories: [],
      transportIncluded: false,
      trustScore: 0,
      ownerUserId: dto.sellerUserId?.trim() || undefined,
    },
  };
}
