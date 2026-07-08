import { cn } from "@shared/lib/cn";

/** Tarjeta orgánica soft UI — productos y servicios (feed + storefront). */
export const storefrontOrganicFeedCardClass = cn(
  "vt-organic-card vt-organic-card--feed vt-organic-card--interactive",
  "group flex h-full min-w-0 flex-col p-3",
);

export const storefrontOrganicFeedCardCompactClass = cn(
  "vt-organic-card vt-organic-card--compact vt-organic-card--interactive",
  "group flex h-full min-w-0 flex-col p-2.5",
);

export const storefrontOrganicMediaClass = "vt-organic-media relative";

export const storefrontOrganicBtnForestClass = "vt-organic-btn vt-organic-btn--forest";
export const storefrontOrganicBtnForestIconClass = cn(
  storefrontOrganicBtnForestClass,
  "vt-organic-btn--icon",
);
export const storefrontOrganicBtnBlockClass = cn(
  storefrontOrganicBtnForestClass,
  "vt-organic-btn--block",
);

export const storefrontOrganicQtyClass = "vt-organic-qty";
export const storefrontOrganicQtyBtnClass = "vt-organic-qty-btn";

export const storefrontOrganicOverlaySaveClass = cn(
  "vt-organic-overlay-btn vt-organic-overlay-btn--icon",
  "absolute top-2 right-2",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
);

export const storefrontOrganicOverlayLikeClass = cn(
  "vt-organic-overlay-btn vt-organic-overlay-btn--like",
  "absolute bottom-2 right-2",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
);

/** Tarjeta de hoja de ruta emergente en el feed home. */
export const homeEmergentRouteOrganicCardClass = storefrontOrganicFeedCardClass;

/** Tile orgánico — tiendas recomendadas en sidebar / carril home. */
export const homeRecommendedStoreOrganicCardClass = cn(
  "vt-organic-card vt-organic-card--tile vt-organic-card--interactive",
  "flex w-full cursor-pointer flex-col gap-2 p-3 text-left",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
);
