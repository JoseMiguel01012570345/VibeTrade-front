import type { ReactNode } from "react";

/** Iconos reutilizables para teselas de categoría (rotan si hay más categorías en el API). */
export const storeCategoryTileIcons: ReactNode[] = [
  (
    <svg
      key="tile-0"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <rect x="6" y="3.5" width="12" height="17" rx="2" />
      <path d="M9 7.5h6M9 12h6M9 16.5h6" />
    </svg>
  ),
  (
    <svg
      key="tile-1"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path d="M10 4h4M11 4v4l-4 5.5a3.5 3.5 0 0 0 2.85 5.5h4.3A3.5 3.5 0 0 0 17 13.5L13 8V4" />
      <path d="M9.5 14h5" />
    </svg>
  ),
  (
    <svg
      key="tile-2"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <rect x="3.5" y="6" width="17" height="11" rx="2" />
      <path d="M8 10.5h8M8 13.5h5" />
    </svg>
  ),
  (
    <svg
      key="tile-3"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  (
    <svg
      key="tile-4"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path d="M5 11.5A2.5 2.5 0 0 1 7.5 9H16a3 3 0 0 1 3 3v3H5v-3.5Z" />
      <path d="M7 15v2.5M17 15v2.5" />
    </svg>
  ),
  (
    <svg
      key="tile-5"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden
    >
      <path d="M7 7h3v3H7zM14 7h3v3h-3zM7 14h3v3H7zM14 14h3v3h-3z" />
    </svg>
  ),
];
