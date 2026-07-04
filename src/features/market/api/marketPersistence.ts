import { useAppStore } from "@features/auth/logic/useAppStore";
import type { StoreProduct, StoreService } from "@features/market/logic/storeCatalogTypes";
import { apiFetch } from "@shared/services/http/apiClient";
import {
  apiErrorTextToUserMessage,
  defaultUnexpectedErrorMessage,
} from "@shared/services/http/apiErrorMessage";
import type {
  MarketState,
  Offer,
  StoreBadge,
} from "@features/market/logic/store/marketStoreTypes";
import { storeProfileBodiesToPersist } from "../logic/marketSerializable";

/** Reservado: antes coordinaba persistencia automática (deshabilitada). */
export function setMarketHydrating(_value: boolean) {}

export type {
  PublicOfferCardResponse,
} from "../Dtos/marketPersistenceTypes";
import type {
  PublicOfferCardResponse,
} from "../Dtos/marketPersistenceTypes";

/**
 * Ficha de oferta (catálogo o publicación `emo_`) + tienda, para abrir /offer/… sin el feed.
 */
export async function fetchPublicOfferCard(
  offerId: string,
): Promise<PublicOfferCardResponse | null> {
  const oid = offerId.trim()
  // Hilos sociales: sin catálogo; el cliente usa fallback desde ChatThreadDto.
  if (oid === '__vt_social__') return null

  const res = await apiFetch(
    `/api/v1/market/offers/${encodeURIComponent(offerId)}/card`,
    { method: "GET" },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    );
  }
  const raw = (await res.json()) as { offer: Offer; store: StoreBadge };
  if (!raw?.offer || !raw.offer.id) return null;
  return { offer: raw.offer, store: raw.store };
}

/** Metadatos de tienda: un PUT por tienda, cuerpo = campos de la ficha (incl. `id`), sin `stores:{...}`. */
export async function saveMarketStoreProfiles(state: MarketState): Promise<void> {
  const app = useAppStore.getState();
  if (!app.isSessionActive) return;
  const ownerUserId = app.me.id === "guest" ? null : app.me.id;
  const bodies = storeProfileBodiesToPersist(state, ownerUserId);
  if (bodies.length === 0) return;
  for (const badge of bodies) {
    const res = await apiFetch("/api/v1/market/workspace/stores", {
      method: "PUT",
      body: JSON.stringify(badge),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (res.status === 409 && t) {
        const j = tryParseJsonBody(t);
        if (j?.message) throw new Error(j.message);
      }
      throw new Error(
        apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
      );
    }
  }
}

/** Una sola ficha de producto (cuerpo = JSON del producto). */
export async function putStoreProduct(
  storeId: string,
  product: StoreProduct,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(product.id)}`,
    {
      method: "PUT",
      body: JSON.stringify(product),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    );
  }
}

export async function deleteStoreProductApi(
  storeId: string,
  productId: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    );
  }
}

/** Una sola ficha de servicio. */
export async function putStoreService(
  storeId: string,
  service: StoreService,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/services/${encodeURIComponent(service.id)}`,
    {
      method: "PUT",
      body: JSON.stringify(service),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    );
  }
}

export async function deleteStoreServiceApi(
  storeId: string,
  serviceId: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/v1/market/stores/${encodeURIComponent(storeId)}/services/${encodeURIComponent(serviceId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(
      apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()),
    );
  }
}

function tryParseJsonBody(s: string): { message?: string } | null {
  try {
    return JSON.parse(s) as { message?: string };
  } catch {
    return null;
  }
}
