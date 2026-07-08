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

/** Tarjeta orgánica — tiendas en feed y búsqueda (mismo relieve que producto/servicio). */
export const storeOrganicCardClass = cn(
  "vt-organic-card vt-organic-card--feed vt-organic-card--interactive",
  "relative flex w-full min-w-0 flex-col gap-2.5 p-3.5 text-left",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
);

/** @deprecated Usar `storeOrganicCardClass` */
export const homeRecommendedStoreOrganicCardClass = storeOrganicCardClass;

/** Panel orgánico — viewport del feed home. */
export const organicFeedPanelClass = cn("vt-organic-panel vt-organic-panel--feed");

/** Panel orgánico — formulario y resultados de búsqueda. */
export const organicSearchPanelClass = cn("vt-organic-panel vt-organic-panel--search");

export const organicShellHeaderClass = "vt-organic-shell-header";
export const organicShellTitleClass = "vt-organic-shell-title";
export const organicShellSearchClass = "vt-organic-shell-search";
export const organicBottomNavClass = "vt-organic-bottom-nav";
export const organicNavTabClass = "vt-organic-nav-tab";
export const organicNavTabActiveClass = "vt-organic-nav-tab--active";
export const organicNavAvatarRingClass = "vt-organic-nav-avatar-ring";
export const organicInputClass = "vt-organic-input";
export const organicBackBtnClass = "vt-organic-back-btn";
export const organicPaginationBtnClass = "vt-organic-pagination-btn";
export const organicFabClass = "vt-organic-fab";
export const organicSheetClass = "vt-organic-sheet";
export const organicIconBtnClass = "vt-organic-icon-btn";
export const organicSlideBgClass = "vt-organic-slide-bg";
export const organicFeedOverlayClass = "vt-organic-feed-overlay";
export const offerCardAmbientClass = "vt-offer-card-ambient";

/** Sheet móvil de tiendas en home con glass. */
export const organicHomeGlassSheetClass = "vt-home-glass-sheet";
export const organicHomeGlassBackdropClass = "vt-home-glass-backdrop";

export const organicSearchSubmitBtnClass = cn(
  storefrontOrganicBtnForestClass,
  "h-11 w-full min-w-[2.75rem] min-[520px]:h-11 min-[520px]:w-11",
);

export const organicNotifCardClass =
  "vt-organic-notif-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2";
export const organicNotifCardUnreadClass = "vt-organic-notif-card--unread";
export const organicNotifCardPressedClass = "vt-organic-notif-card--pressed";
export const organicNotifIconClass = "vt-organic-notif-icon";
export const organicNotifSectionClass = "vt-organic-notif-section";
export const organicChipBtnClass = "vt-organic-chip-btn";
export const organicChipBtnDangerClass = "vt-organic-chip-btn vt-organic-chip-btn--danger";
export const organicChipBtnTextClass = "vt-organic-chip-btn vt-organic-chip-btn--text";
export const organicCollapseOpenClass = "vt-organic-collapse vt-organic-collapse--open";
export const organicCollapseClosedClass = "vt-organic-collapse vt-organic-collapse--closed";
export const organicListEnterClass = "vt-organic-list-enter";
