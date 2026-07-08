import {
  fetchMediaObjectUrl,
  getCachedMediaObjectUrl,
  isProtectedMediaUrl,
  normalizeMediaCacheKey,
} from "@shared/services/media/mediaClient";
import type { CSSProperties } from "react";

/** RGB en formato `r,g,b` para CSS `rgb(var(--token))`. */
export type RgbTriplet = `${number},${number},${number}`;

export const ORGANIC_AMBIENT_DEFAULT_RGB: RgbTriplet = "118,148,107";

const SAMPLE_MAX_EDGE = 128;
/** Realce para tarjetas en modo claro (evita saturar a blanco como ×2.5). */
const OFFER_CARD_LIGHT_BOOST = 1.35;
const OFFER_CARD_DARK_DIM = 0.55;
const STOREFRONT_SURFACE_LIGHT_BOOST = 1.15;
const STOREFRONT_SURFACE_DARK_DIM = 0.62;

export type DominantColorPurpose = "offer-card" | "storefront-surface";

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseRgbTriplet(rgb: RgbTriplet): [number, number, number] {
  const [r, g, b] = rgb.split(",").map((part) => Number(part.trim()));
  return [r, g, b];
}

function formatRgbTriplet(r: number, g: number, b: number): RgbTriplet {
  return `${clampChannel(r)},${clampChannel(g)},${clampChannel(b)}`;
}

export function scaleRgbTriplet(
  rgb: RgbTriplet,
  multiplier: number,
): RgbTriplet {
  const [r, g, b] = parseRgbTriplet(rgb);
  return formatRgbTriplet(r * multiplier, g * multiplier, b * multiplier);
}

/** Ajusta el dominante para fondos amplios del storefront (página / footer). */
export function storefrontSurfaceAmbientRgb(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): RgbTriplet {
  if (scheme === "light") {
    return scaleRgbTriplet(rgb, STOREFRONT_SURFACE_LIGHT_BOOST);
  }
  return scaleRgbTriplet(rgb, STOREFRONT_SURFACE_DARK_DIM);
}

function adjustDominantForPurpose(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
  purpose: DominantColorPurpose,
): RgbTriplet {
  if (purpose === "storefront-surface") {
    return storefrontSurfaceAmbientRgb(rgb, scheme);
  }
  return offerCardAmbientRgb(rgb, scheme);
}

export function fallbackRgbForPurpose(
  scheme: "light" | "dark",
  purpose: DominantColorPurpose,
): RgbTriplet {
  return adjustDominantForPurpose(ORGANIC_AMBIENT_DEFAULT_RGB, scheme, purpose);
}

/** Ajusta el dominante extraído para el fondo glass de tarjetas de oferta. */
export function offerCardAmbientRgb(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): RgbTriplet {
  if (scheme === "light") {
    return scaleRgbTriplet(rgb, OFFER_CARD_LIGHT_BOOST);
  }
  return scaleRgbTriplet(rgb, OFFER_CARD_DARK_DIM);
}

/** @deprecated Usar `offerCardAmbientRgb` para tarjetas; se mantiene por compatibilidad. */
export function ambientRgbForScheme(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): RgbTriplet {
  return offerCardAmbientRgb(rgb, scheme);
}

/** Cuenta colores cuantizados (paso 16) y devuelve el dominante sin realzar píxeles. */
export function extractDominantRgbFromImageData(
  data: Uint8ClampedArray,
  scheme: "light" | "dark" = "light",
  purpose: DominantColorPurpose = "offer-card",
): RgbTriplet {
  const colors: Record<string, number> = {};

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 16) continue;

    const r = Math.round(data[i] / 16) * 16;
    const g = Math.round(data[i + 1] / 16) * 16;
    const b = Math.round(data[i + 2] / 16) * 16;
    const key = `${r},${g},${b}`;

    colors[key] = (colors[key] || 0) + 1;
  }

  const ranked = Object.entries(colors).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) {
    return fallbackRgbForPurpose(scheme, purpose);
  }

  return adjustDominantForPurpose(ranked[0][0] as RgbTriplet, scheme, purpose);
}

/** Extrae el color dominante de un `<img>` ya cargado (misma muestra que la URL). */
export function extractDominantRgbFromImageElement(
  img: HTMLImageElement,
  scheme: "light" | "dark" = "light",
  purpose: DominantColorPurpose = "offer-card",
): RgbTriplet {
  const fallback = fallbackRgbForPurpose(scheme, purpose);
  if (!img.complete || img.naturalWidth <= 0) return fallback;
  try {
    const imageData = sampleImageToImageData(img);
    if (!imageData) return fallback;
    return extractDominantRgbFromImageData(imageData.data, scheme, purpose);
  } catch {
    return fallback;
  }
}

function sampleImageToImageData(img: HTMLImageElement): ImageData | null {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const scale = Math.min(
    1,
    SAMPLE_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight, 1),
  );
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Extrae el color dominante de una URL de imagen (soporta medios protegidos vía blob). */
export async function extractDominantRgbFromImageUrl(
  url: string,
  scheme: "light" | "dark" = "light",
  purpose: DominantColorPurpose = "offer-card",
): Promise<RgbTriplet> {
  const fallback = fallbackRgbForPurpose(scheme, purpose);
  const cacheKey = normalizeMediaCacheKey(url);

  let loadUrl = url;
  if (isProtectedMediaUrl(url)) {
    const cached = getCachedMediaObjectUrl(cacheKey);
    if (cached) {
      loadUrl = cached;
    } else {
      try {
        loadUrl = await fetchMediaObjectUrl(cacheKey);
      } catch {
        return fallback;
      }
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (!loadUrl.startsWith("blob:") && !loadUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      try {
        const imageData = sampleImageToImageData(img);
        if (!imageData) {
          resolve(fallback);
          return;
        }
        resolve(extractDominantRgbFromImageData(imageData.data, scheme, purpose));
      } catch {
        resolve(fallback);
      }
    };

    img.onerror = () => resolve(fallback);
    img.src = loadUrl;
  });
}

export function storefrontPageBackground(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): string {
  const tint = scheme === "light" ? "26%" : "18%";
  return `color-mix(in oklab, rgb(${rgb}) ${tint}, var(--bg))`;
}

/** Acento legible para texto y links. */
export function storefrontAccentRgb(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): RgbTriplet {
  if (scheme === "light") {
    return formatRgbTriplet(
      parseRgbTriplet(rgb)[0] * 0.55 + 15,
      parseRgbTriplet(rgb)[1] * 0.55 + 45,
      parseRgbTriplet(rgb)[2] * 0.55 + 35,
    );
  }
  return scaleRgbTriplet(rgb, 0.85);
}

/** Acento fuerte para botones primarios y estados activos. */
export function storefrontAccentStrongRgb(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): RgbTriplet {
  if (scheme === "light") {
    return formatRgbTriplet(
      parseRgbTriplet(rgb)[0] * 0.72 + 8,
      parseRgbTriplet(rgb)[1] * 0.72 + 28,
      parseRgbTriplet(rgb)[2] * 0.72 + 22,
    );
  }
  return scaleRgbTriplet(rgb, 0.75);
}

export function storefrontBorderRgb(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): RgbTriplet {
  if (scheme === "light") {
    return formatRgbTriplet(
      parseRgbTriplet(rgb)[0] * 0.35 + 180,
      parseRgbTriplet(rgb)[1] * 0.35 + 200,
      parseRgbTriplet(rgb)[2] * 0.35 + 190,
    );
  }
  return scaleRgbTriplet(rgb, 0.45);
}

export function storefrontHeaderBackground(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): string {
  const tint = scheme === "light" ? "38%" : "28%";
  const base =
    scheme === "light"
      ? "color-mix(in oklab, rgba(255, 255, 255, 0.94) 100%, var(--surface))"
      : "color-mix(in oklab, rgba(26, 58, 50, 0.88) 100%, var(--surface))";
  return `color-mix(in oklab, rgb(${rgb}) ${tint}, ${base})`;
}

export function storefrontSurfaceBackground(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): string {
  const tint = scheme === "light" ? "32%" : "22%";
  const base =
    scheme === "light"
      ? "color-mix(in oklab, rgba(255, 255, 255, 0.88) 100%, var(--surface))"
      : "color-mix(in oklab, rgba(26, 58, 50, 0.75) 100%, var(--surface))";
  return `color-mix(in oklab, rgb(${rgb}) ${tint}, ${base})`;
}

export function storefrontMutedSurfaceBackground(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): string {
  const tint = scheme === "light" ? "18%" : "14%";
  const base =
    scheme === "light"
      ? "color-mix(in oklab, #fbfaf8 100%, var(--surface))"
      : "color-mix(in oklab, rgba(26, 58, 50, 0.65) 100%, var(--surface))";
  return `color-mix(in oklab, rgb(${rgb}) ${tint}, ${base})`;
}

export type StorefrontShellCssVars = {
  "--storefront-page-rgb": RgbTriplet;
  "--storefront-accent-rgb": RgbTriplet;
  "--storefront-accent-strong-rgb": RgbTriplet;
  "--storefront-border-rgb": RgbTriplet;
};

export function buildStorefrontShellCssVars(
  pageRgb: RgbTriplet,
  scheme: "light" | "dark",
  accentRgb?: RgbTriplet,
): StorefrontShellCssVars {
  const accent = accentRgb ?? pageRgb;
  return {
    "--storefront-page-rgb": pageRgb,
    "--storefront-accent-rgb": storefrontAccentRgb(accent, scheme),
    "--storefront-accent-strong-rgb": storefrontAccentStrongRgb(accent, scheme),
    "--storefront-border-rgb": storefrontBorderRgb(accent, scheme),
  };
}

export function storefrontShellStyle(
  pageRgb: RgbTriplet,
  scheme: "light" | "dark",
  accentRgb?: RgbTriplet,
): CSSProperties {
  return {
    ...buildStorefrontShellCssVars(pageRgb, scheme, accentRgb),
    background: storefrontPageBackground(pageRgb, scheme),
  } as CSSProperties;
}

export function storefrontFooterBackground(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): string {
  const tint = scheme === "light" ? "42%" : "30%";
  const base =
    scheme === "light"
      ? "#f0ebe6"
      : "color-mix(in oklab, rgba(26, 58, 50, 0.9) 100%, var(--surface))";
  return `color-mix(in oklab, rgb(${rgb}) ${tint}, ${base})`;
}

export function offerCardAmbientBackground(
  rgb: RgbTriplet,
  scheme: "light" | "dark",
): string {
  const tint = scheme === "light" ? "58%" : "36%";
  const base =
    scheme === "light"
      ? "color-mix(in oklab, rgba(255, 255, 255, 0.48) 100%, var(--surface))"
      : "color-mix(in oklab, rgba(26, 58, 50, 0.62) 100%, var(--surface))";
  return `color-mix(in oklab, rgb(${rgb}) ${tint}, ${base})`;
}
