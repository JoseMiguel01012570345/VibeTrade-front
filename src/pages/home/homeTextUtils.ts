import type { StoreLocationPoint } from "../../app/store/marketStoreTypes";

export function storeCategoriesLabel(categories: string[], max = 3): string {
  const c = categories.map((x) => x.trim()).filter(Boolean);
  if (c.length === 0) return "Sin categoría";
  return c.slice(0, max).join(" · ");
}

export function isValidStoreLocation(
  loc: StoreLocationPoint | undefined,
): loc is StoreLocationPoint {
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number")
    return false;
  return Number.isFinite(loc.lat) && Number.isFinite(loc.lng);
}

/** Descripción de oferta en una línea con elipsis (texto + CSS `line-clamp`). */
export function offerDescriptionPreview(
  text: string | undefined,
  maxChars = 96,
): string {
  const raw = (text ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (raw.length <= maxChars) return raw;
  let cut = raw.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.55) cut = cut.slice(0, lastSpace);
  return `${cut.trimEnd()}…`;
}

export function storeDescriptionSnippet(
  pitchFromBadge: string | undefined,
  catalogPitch: string | undefined,
  maxChars = 110,
): string {
  const raw = (pitchFromBadge ?? catalogPitch ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  if (raw.length <= maxChars) return raw;
  let cut = raw.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.55) cut = cut.slice(0, lastSpace);
  return `${cut.trimEnd()}…`;
}
