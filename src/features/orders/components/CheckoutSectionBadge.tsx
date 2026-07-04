/** Número circular que encabeza cada sección del checkout. */
export function CheckoutSectionBadge({ n }: Readonly<{ n: number }>) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-extrabold text-emerald-800">
      {n}
    </span>
  );
}
