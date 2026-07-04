/** Paginación del listado principal en la home (catálogo guest). */
export const PAGE_SIZE = 8;

/** Pool para “Ofertas…” (muestreo aleatorio). */
export const SPOTLIGHT_POOL_PAGE_SIZE = 100;
export const SPOTLIGHT_SECTION_MAX = 10;
export const SPOTLIGHT_PREVIEW_COUNT = 4;

/** Intervalo entre slides del `BannerSlider`. */
export const PROMO_ROTATE_MS = 4800;

/** Contenedor del slide: más alto en móvil; en `sm+` respeta la altura natural de la imagen. */
export const BANNER_SLIDE_CLASS = "aspect-[16/9] overflow-hidden sm:aspect-auto";

/** Imagen del banner: recorta con `object-cover` en móvil para llenar el aspect ratio. */
export const BANNER_IMG_CLASS =
  "block h-full w-full object-cover sm:h-auto sm:w-full sm:object-none";

/**
 * Compensa el `px-4` del `<main>` y deja 3px al borde de pantalla en móvil.
 * Requiere `w-[calc(...)]` además del margen negativo para evitar descentrado.
 */
export const BANNER_MOBILE_EDGE_CLASS =
  "-mx-[calc(1rem-3px)] w-[calc(100%+2*(1rem-3px))] sm:mx-0 sm:w-full";

/** Debe coincidir con `animation-duration` en `.ce-promo-exit-right` / `.ce-promo-enter-from-left` (`index.css`). */
export const PROMO_TRANSITION_MS = 360;
