/** Número circular que encabeza cada sección del checkout. */
export function CheckoutSectionBadge({ n }: Readonly<{ n: number }>) {
  return (
    <span className="vt-storefront-step-badge flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold">
      {n}
    </span>
  );
}
