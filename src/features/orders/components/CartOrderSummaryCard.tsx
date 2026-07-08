import { Lock, Share2 } from "lucide-react";
import { priceTag } from "../logic/formatMoney";

/** Tarjeta de resumen del pedido + acciones (proceder al pago / compartir carrito). */
export function CartOrderSummaryCard({
  units,
  subtotal,
  currency,
  onCheckout,
  onShare,
  sharing,
  shareDisabled,
}: Readonly<{
  units: number;
  subtotal: number;
  currency: string;
  onCheckout: () => void;
  onShare: () => void;
  sharing: boolean;
  shareDisabled: boolean;
}>) {
  return (
    <aside className="flex min-w-0 flex-col gap-4 lg:flex-[4] lg:sticky lg:top-28">
      <div className="vt-storefront-section-panel rounded-[10px] border p-4 shadow-[var(--shadow)]">
        <h2 className="text-[1.15rem] font-extrabold tracking-tight text-[var(--text)]">
          Resumen del Pedido
        </h2>

        <div className="mt-5 space-y-3 text-[0.84rem] text-[var(--muted)]">
          <div className="flex items-center justify-between">
            <span>Subtotal ({units} artículos)</span>
            <span className="font-semibold text-[var(--text)]">
              {priceTag(subtotal, currency)}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span>Envío</span>
            <span className="max-w-[12rem] text-right text-[0.8rem] font-medium leading-snug text-[var(--muted)]">
              {currency
                ? `Según ubicación en checkout (${currency})`
                : "Según ubicación en checkout"}
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <div className="flex items-end justify-between gap-4">
            <span className="text-[0.98rem] font-extrabold tracking-tight text-[var(--text)]">
              Total estimado
            </span>
            <span className="text-[1.15rem] font-extrabold tracking-tight text-[var(--text)]">
              {priceTag(subtotal, currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="vt-storefront-section-panel rounded-[10px] border p-4 shadow-[var(--shadow)]">
        <button
          type="button"
          onClick={onCheckout}
          className="vt-storefront-accent-btn flex h-12 w-full items-center justify-center gap-2 rounded-[8px] text-sm font-bold text-white transition"
        >
          <span>Proceder al pago</span>
          <Lock className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={shareDisabled}
          className="vt-storefront-accent-btn-outline mt-3 flex h-12 w-full items-center justify-center gap-3 rounded-[8px] border text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{sharing ? "Copiando enlace…" : "Compartir carrito"}</span>
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
