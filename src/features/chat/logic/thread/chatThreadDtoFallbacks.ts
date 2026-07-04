import type { Offer, StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import type { ChatThreadDto } from "@features/chat/Dtos/thread/chatApiTypes";

/** Oferta ficticia en hilos sociales (alineado al backend). */
export const VT_SOCIAL_PLACEHOLDER_OFFER_ID = "__vt_social__";

/** Oferta ficticia en hilos de soporte tienda (alineado al backend). */
export const VT_SUPPORT_PLACEHOLDER_OFFER_ID = "__vt_support__";

/** Si la ficha pública no está en el store, el hilo sigue accesible vía API (p. ej. transportista aceptado). */
export function minimalOfferStoreFromChatThreadDto(dto: ChatThreadDto): {
  offer: Offer;
  store: StoreBadge;
} {
  const sid = dto.storeId?.trim() || "";
  const oid = dto.offerId?.trim() || "";
  const social =
    dto.isSocialGroup === true ||
    dto.offerId?.trim() === VT_SOCIAL_PLACEHOLDER_OFFER_ID;
  const support =
    dto.isSupportThread === true ||
    dto.offerId?.trim() === VT_SUPPORT_PLACEHOLDER_OFFER_ID;
  return {
    offer: {
      id: oid,
      storeId: sid,
      title: social ? "Chat" : support ? "Soporte" : "Oferta del chat",
      price: "—",
      tags: [],
      imageUrl: "",
    },
    store: {
      id: sid,
      name: social ? "Mensajes" : support ? "Soporte" : "Tienda",
      verified: false,
      categories: [],
      transportIncluded: false,
      trustScore: 0,
      ownerUserId: dto.sellerUserId?.trim() || undefined,
    },
  };
}
