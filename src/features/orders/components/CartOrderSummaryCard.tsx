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
      <div className="rounded-[10px] border border-[#dbe2ee] bg-[#eaf1ff] p-4 shadow-[0_10px_22px_rgba(33,37,41,0.05)]">
        <h2 className="text-[1.15rem] font-extrabold tracking-tight text-slate-900">
          Resumen del Pedido
        </h2>

        <div className="mt-5 space-y-3 text-[0.84rem] text-slate-600">
          <div className="flex items-center justify-between">
            <span>Subtotal ({units} artículos)</span>
            <span className="font-semibold text-slate-700">
              {priceTag(subtotal, currency)}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span>Envío</span>
            <span className="max-w-[12rem] text-right text-[0.8rem] font-medium leading-snug text-slate-500">
              {currency
                ? `Según ubicación en checkout (${currency})`
                : "Según ubicación en checkout"}
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-[#d8deea] pt-4">
          <div className="flex items-end justify-between gap-4">
            <span className="text-[0.98rem] font-extrabold tracking-tight text-slate-900">
              Total estimado
            </span>
            <span className="text-[1.15rem] font-extrabold tracking-tight text-slate-900">
              {priceTag(subtotal, currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#e8edf5] bg-[#f7faff] p-4 shadow-[0_10px_22px_rgba(33,37,41,0.04)]">
        <button
          type="button"
          onClick={onCheckout}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-emerald-700 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          <span>Proceder al pago</span>
          <Lock className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={shareDisabled}
          className="mt-3 flex h-12 w-full items-center justify-center gap-3 rounded-[8px] border border-emerald-700 bg-white text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{sharing ? "Copiando enlace…" : "Compartir carrito"}</span>
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
