import type { OwnerStoreFormValues, StoreBadge } from "../../../app/store/marketStoreTypes";
import type { StoreCustomAttachment } from "../../chat/domain/storeCatalogTypes";

export type ProductPhotoSlot = { id: string; url: string; fileName: string };

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

export function revokeIfBlob(url: string) {
  if (url.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* noop */
    }
  }
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
  };
}
