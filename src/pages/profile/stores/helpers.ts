import type { OwnerStoreFormValues, StoreBadge } from "../../../app/store/marketStoreTypes";
import type { StoreCustomAttachment } from "../../chat/domain/storeCatalogTypes";
import { isProtectedMediaUrl } from "../../../utils/media/mediaClient";
import { revokeObjectUrlIfNeeded } from "../../../utils/media/dataUrl";

export type ProductPhotoSlot = {
  id: string;
  url: string;
  fileName: string;
  /** Si existe, viene del upload; si no, se infiere de la URL al hidratar. */
  contentKind?: StoreCustomAttachment["kind"];
};

/** Clasificación heurística para URLs ya persistidas (p. ej. sin metadata en el slot). */
export function inferCatalogMediaKindFromUrl(url: string): StoreCustomAttachment["kind"] {
  const u = url.trim();
  if (!u) return "other";
  const lower = u.toLowerCase();
  if (lower.startsWith("data:image/")) return "image";
  if (lower.startsWith("data:application/pdf") || lower.includes("application/pdf")) return "pdf";
  if (/\.(pdf)(\?|#|$)/i.test(lower)) return "pdf";
  if (/\.(jpe?g|png|gif|webp|avif|svg)(\?|#|$)/i.test(lower)) return "image";
  // Referencias internas: el servidor filtra por MimeType al persistir la ficha.
  if (isProtectedMediaUrl(u)) return "image";
  if (lower.startsWith("http://") || lower.startsWith("https://")) return "image";
  return "other";
}

/** Solo URLs aptas para `photoUrls` de servicios (excluye PDFs y otros documentos). */
export function serviceCatalogImagePhotoUrlsFromSlots(slots: ProductPhotoSlot[]): string[] {
  return slots
    .filter((s) => {
      if (s.contentKind === "pdf" || s.contentKind === "other") return false;
      const kind = s.contentKind ?? inferCatalogMediaKindFromUrl(s.url);
      return kind === "image";
    })
    .map((s) => s.url.trim())
    .filter(Boolean);
}

export function fixSplitLines(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function productPhotoSlotsFromUrls(urls: string[]): ProductPhotoSlot[] {
  return urls
    .map((u) => u.trim())
    .filter(Boolean)
    .map((url, i) => ({
      id: `product-photo-existing-${i}`,
      url,
      fileName: `Foto ${i + 1}`,
      contentKind: inferCatalogMediaKindFromUrl(url),
    }));
}

export function newAttachmentId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `at_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function fileToKind(file: File): StoreCustomAttachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  return "other";
}

/** Revoca solo `blob:` locales; data URLs no usan revoke. */
export function revokeIfBlob(url: string) {
  revokeObjectUrlIfNeeded(url);
}

export function ownerStoreToFormValues(
  b: StoreBadge,
  pitch: string,
): OwnerStoreFormValues {
  return {
    name: b.name,
    categories: [...b.categories],
    categoryPitch: pitch,
    transportIncluded: b.transportIncluded,
    location: b.location,
  };
}
