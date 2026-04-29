import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Truck, X } from "lucide-react";
import { cn } from "../../lib/cn";
import type { UserTransportServiceOption } from "../../utils/user/transportEligibility";

type Props = {
  open: boolean;
  onClose: () => void;
  services: UserTransportServiceOption[];
  initialServiceId: string | null;
  /** Texto breve del tramo elegido (p. ej. orden y ruta). */
  stopSummary: string;
  submitting?: boolean;
  onConfirm: (storeServiceId: string) => void;
};

export function RouteTramoSubscribeModal({
  open,
  onClose,
  services,
  initialServiceId,
  stopSummary,
  submitting = false,
  onConfirm,
}: Props) {
  const [pick, setPick] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const d =
      initialServiceId && services.some((s) => s.serviceId === initialServiceId)
        ? initialServiceId
        : (services[0]?.serviceId ?? "");
    setPick(d);
  }, [open, initialServiceId, services]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="vt-modal-backdrop !z-[110]"
      role="presentation"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="vt-modal max-h-[min(90vh,520px)] max-w-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-tramo-subscribe-title"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="vt-modal-title flex items-center gap-2" id="route-tramo-subscribe-title">
              <Truck size={18} className="shrink-0 text-[var(--primary)]" aria-hidden />
              Servicio de transporte
            </div>
            <p className="vt-modal-body mb-0 mt-1">
              Elige con qué servicio de <strong>tus tiendas</strong> te suscribes. El servidor comprueba que el
              servicio califique como transporte y avisa al comprador y al vendedor del hilo.
            </p>
            <p className="mt-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
              Tramo: {stopSummary}
            </p>
          </div>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[color-mix(in_oklab,var(--muted)_18%,var(--surface))] hover:text-[var(--text)] disabled:opacity-40"
            aria-label="Cerrar"
            disabled={submitting}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {services.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--bad)]">
            No tienes servicios de transporte publicados en tus tiendas. Crea o publica uno en el catálogo.
          </p>
        ) : (
          <ul className="m-0 mt-3 max-h-[min(50vh,280px)] list-none space-y-2 overflow-y-auto p-0 pr-1">
            {services.map((s) => (
              <li key={s.serviceId}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    pick === s.serviceId
                      ? "border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]"
                      : "border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] hover:border-[color-mix(in_oklab,var(--primary)_22%,var(--border))]",
                  )}
                >
                  <input
                    type="radio"
                    name="route-tramo-svc"
                    className="mt-1"
                    checked={pick === s.serviceId}
                    disabled={submitting}
                    onChange={() => setPick(s.serviceId)}
                  />
                  <span className="min-w-0 text-[13px] font-semibold leading-snug">{s.label}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
          <button type="button" className="vt-btn" disabled={submitting} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            disabled={submitting || !pick || services.length === 0}
            onClick={() => onConfirm(pick)}
          >
            {submitting ? "Enviando…" : "Confirmar solicitud"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
