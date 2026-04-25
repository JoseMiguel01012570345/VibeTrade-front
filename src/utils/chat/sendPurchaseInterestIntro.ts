import type { Offer } from "../../app/store/marketStoreTypes";
import type { StoreCatalog } from "../../pages/chat/domain/storeCatalogTypes";
import { isToolPlaceholderUrl } from "../market/toolPlaceholder";
import { mediaApiUrl, uploadMediaBlob } from "../media/mediaClient";
import { postChatMessage, postChatTextMessage } from "./chatApi";

function catalogIdForOffer(offer: Offer): string {
  return (offer.emergentBaseOfferId?.trim() || offer.id).trim();
}

export function catalogItemKind(
  offer: Offer,
  storeCatalogs: Partial<Record<string, StoreCatalog>>,
): "product" | "service" | "unknown" {
  const cat = storeCatalogs[offer.storeId];
  if (!cat) return "unknown";
  const oid = catalogIdForOffer(offer);
  if (!oid) return "unknown";
  if (cat.products.some((p) => p.id === oid)) return "product";
  if (cat.services.some((s) => s.id === oid)) return "service";
  return "unknown";
}

/** URLs de ficha, sin duplicar ni placeholders, orden estable. */
export function collectOfferPublishedPhotoUrls(offer: Offer): string[] {
  const raw = [offer.imageUrl, ...(offer.imageUrls ?? [])]
    .map((u) => (u ?? "").trim())
    .filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of raw) {
    if (isToolPlaceholderUrl(u)) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function buildIntroCaption(
  offer: Offer,
  kind: "product" | "service" | "unknown",
  hasRealPhotos: boolean,
): string {
  const rawTitle = (offer.title ?? "").trim();
  const book = rawTitle.length > 0 ? `«${rawTitle}»` : "esta oferta";
  if (kind === "product") {
    if (hasRealPhotos) {
      return `Hola, tengo interés en el producto ${book}. Vi las fotos publicadas en la ficha y me gustaría coordinar con vos.`;
    }
    return `Hola, tengo interés en el producto ${book}. Quiero charlar con vos para avanzar con la compra.`;
  }
  if (kind === "service") {
    if (hasRealPhotos) {
      return `Hola, tengo interés en el servicio ${book}. Vi las imágenes de la ficha y me gustaría coordinar con vos.`;
    }
    return `Hola, tengo interés en el servicio ${book}. Me gustaría charlar con vos para avanzar.`;
  }
  if (hasRealPhotos) {
    return `Hola, tengo interés en la oferta ${book}. Comparto referencia de la ficha y me gustaría charlar con vos.`;
  }
  return `Hola, tengo interés en la oferta ${book}. Quiero abrir un canal con vos para charlarlo.`;
}

async function publicImageUrlToMediaRef(
  publicUrl: string,
  i: number,
): Promise<string | null> {
  try {
    const res = await fetch(publicUrl, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    const mime = blob.type || "image/jpeg";
    let ext = "jpg";
    if (mime.includes("png")) ext = "png";
    else if (mime.includes("webp")) ext = "webp";
    const uploaded = await uploadMediaBlob(
      blob,
      `oferta_ficha_${i}.${ext}`,
      mime,
    );
    return mediaApiUrl(uploaded.id);
  } catch {
    return null;
  }
}

/**
 * Primer mensaje al iniciar el chat desde "Comprar": un solo mensaje imagen + texto si hay fotos de ficha
 * (subidas vía media API), si no, solo texto.
 */
export async function sendPurchaseInterestIntro(
  threadId: string,
  offer: Offer,
  storeCatalogs: Partial<Record<string, StoreCatalog>>,
): Promise<void> {
  if (!threadId.startsWith("cth_")) {
    throw new Error("thread_not_persisted");
  }
  const kind = catalogItemKind(offer, storeCatalogs);
  const publicUrls = collectOfferPublishedPhotoUrls(offer);
  const hasRealPhotos = publicUrls.length > 0;
  const caption = buildIntroCaption(offer, kind, hasRealPhotos);

  if (publicUrls.length === 0) {
    await postChatTextMessage(threadId, caption);
    return;
  }

  const uploaded: { url: string }[] = [];
  for (let i = 0; i < publicUrls.length; i++) {
    const mediaUrl = await publicImageUrlToMediaRef(publicUrls[i], i);
    if (mediaUrl) uploaded.push({ url: mediaUrl });
  }

  if (uploaded.length === 0) {
    await postChatTextMessage(threadId, caption);
    return;
  }

  await postChatMessage(threadId, {
    type: "image",
    images: uploaded,
    caption,
  });
}
