import { ArrowRight } from "lucide-react";

/** Botón de envío del checkout: rotula según el estado (procesando/calculando). */
export function CheckoutPayButton({
  isCreating,
  previewLoading,
  className = "",
}: Readonly<{
  isCreating: boolean;
  previewLoading: boolean;
  className?: string;
}>) {
  let label = "Confirmar y pagar";
  if (isCreating) label = "Procesando…";
  else if (previewLoading) label = "Calculando envío…";
  const disabled = isCreating || previewLoading;
  return (
    <button
      type="submit"
      disabled={disabled}
      className={`vt-storefront-accent-btn flex w-full items-center justify-center gap-2 rounded-[10px] py-4 text-base font-bold text-white shadow-[0_14px_28px_color-mix(in_oklab,var(--primary)_32%,transparent)] transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      <span>{label}</span>
      {!disabled ? <ArrowRight className="h-5 w-5" aria-hidden /> : null}
    </button>
  );
}
