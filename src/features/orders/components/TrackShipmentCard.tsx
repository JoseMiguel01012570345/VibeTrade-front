import type { FormEvent, RefObject } from "react";
import { ArrowRight, Truck } from "lucide-react";

/** Tarjeta con el formulario de búsqueda del rastreo (número de pedido + consultar). */
export function TrackShipmentCard({
  inputRef,
  value,
  onChange,
  onSubmit,
  submitting,
  canSubmit,
}: Readonly<{
  inputRef: RefObject<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  canSubmit: boolean;
}>) {
  return (
    <div className="vt-storefront-section-panel rounded-[18px] border p-6 shadow-[0_18px_44px_rgba(33,37,41,0.08)] sm:p-8">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="track-order-id"
            className="block text-sm font-bold text-slate-800"
          >
            Número de pedido
          </label>
          <p className="mt-1 hidden text-xs leading-relaxed text-slate-500 sm:block">
            Número público (BX-…) o el identificador ID del pedido que recibiste
            al confirmar la compra.
          </p>
          <div className="relative mt-3">
            <span
              className="vt-storefront-accent-text pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
              aria-hidden
            >
              <Truck className="h-5 w-5" />
            </span>
            <input
              ref={inputRef}
              id="track-order-id"
              type="text"
              autoComplete="off"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="ej. BX-12345678"
              className="vt-storefront-input h-12 w-full rounded-full border pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="vt-storefront-accent-btn flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white shadow-[0_14px_28px_rgba(4,120,87,0.22)] transition disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span>{submitting ? "Consultando…" : "Consultar Estado"}</span>
          {!submitting ? <ArrowRight className="h-5 w-5 shrink-0" aria-hidden /> : null}
        </button>
      </form>
    </div>
  );
}
