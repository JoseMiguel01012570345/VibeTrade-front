/**
 * Icono de carrito de la tarjeta de producto. Copiado tal cual de la app de
 * referencia (frontend-guest): `src/lib/ui/ProductCardCartIcon.tsx`.
 */
export function ProductCardCartIcon({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M3 3.75a.75.75 0 0 1 .75-.75h1.02a1.5 1.5 0 0 1 1.46 1.15l.2.85h12.82a.75.75 0 0 1 .73.93l-1.56 6.5a1.5 1.5 0 0 1-1.46 1.15H8.13a1.5 1.5 0 0 1-1.46-1.16L4.82 4.5h-1.07A.75.75 0 0 1 3 3.75Zm5.5 15.75a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Zm9 0a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Z" />
    </svg>
  );
}
