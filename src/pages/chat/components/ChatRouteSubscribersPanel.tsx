import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, X } from "lucide-react";
import type { RouteOfferPublicState } from "../../../app/store/marketStoreTypes";
import { cn } from "../../../lib/cn";
import {
  collectRouteOfferSubscribersForSheet,
  type RouteOfferSubscriberSummary,
} from "../domain/routeOfferSubscribers";
import { railItemClass } from "./rail/chatRailStyles";

type Props = {
  routeOffer: RouteOfferPublicState | undefined;
  routeSheetId: string;
  routeSheetTitle?: string;
  onClose: () => void;
  /** Desde notificación: abrir detalle y resaltar. */
  highlightUserId?: string | null;
};

function statusLabel(s: RouteOfferSubscriberSummary["tramos"][0]["status"]) {
  return s === "confirmed" ? "Confirmado" : "Pendiente de validación";
}

export function ChatRouteSubscribersPanel({
  routeOffer,
  routeSheetId,
  routeSheetTitle,
  onClose,
  highlightUserId,
}: Props) {
  const [selected, setSelected] = useState<RouteOfferSubscriberSummary | null>(null);
  const autoOpenedForHi = useRef<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const subscribers = useMemo(
    () => collectRouteOfferSubscribersForSheet(routeOffer, routeSheetId),
    [routeOffer, routeSheetId],
  );

  const hi = highlightUserId?.trim() ?? "";

  useEffect(() => {
    if (!hi) {
      autoOpenedForHi.current = null;
      return;
    }
    if (autoOpenedForHi.current === hi) return;
    const sub = subscribers.find((s) => s.userId === hi);
    if (!sub) return;
    autoOpenedForHi.current = hi;
    setSelected(sub);
    requestAnimationFrame(() => {
      rowRefs.current[hi]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [hi, subscribers]);

  const showHighlightRing = hi.length > 0 && selected?.userId === hi;

  return (
    <aside
      className={cn(
        "flex max-h-full min-h-0 w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_4px_24px_rgba(15,23,42,0.08)]",
        "max-[640px]:max-h-[42vh] max-[640px]:w-full",
        showHighlightRing &&
          "ring-2 ring-[color-mix(in_oklab,var(--primary)_55%,var(--border))] ring-offset-2 ring-offset-[var(--surface)]",
      )}
      aria-label="Suscriptores a la oferta de hoja de ruta"
    >
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
            Oferta publicada
          </div>
          <div className="mt-0.5 truncate text-[13px] font-extrabold leading-tight text-[var(--text)]">
            {selected ? (
              <button
                type="button"
                className="m-0 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-left text-[13px] font-extrabold text-[var(--primary)]"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft size={14} aria-hidden /> Volver
              </button>
            ) : (
              "Suscriptores"
            )}
          </div>
          {routeSheetTitle && !selected ? (
            <p className="vt-muted mb-0 mt-1 line-clamp-2 text-[11px] leading-snug">{routeSheetTitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="vt-btn shrink-0 p-1.5"
          aria-label="Cerrar panel de suscriptores"
          title="Cerrar"
          onClick={onClose}
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2.5">
        {selected ? (
          <div
            className={cn(
              "px-1 text-[13px]",
              showHighlightRing &&
                "rounded-xl border border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_7%,var(--surface))] p-2",
            )}
          >
            {showHighlightRing ? (
              <p className="mb-2 mt-0 text-[10px] font-black uppercase tracking-wide text-[var(--primary)]">
                Solicitud reciente
              </p>
            ) : null}
            <div className="text-[15px] font-black leading-tight">{selected.displayName}</div>
            <p className="vt-muted mb-0 mt-2 text-[11px] leading-snug">
              <span className="font-extrabold text-[var(--text)]">Confianza: </span>
              {selected.trustScore}
            </p>
            <p className="mb-0 mt-1.5 text-[11px] leading-snug">
              <span className="font-extrabold text-[var(--muted)]">Teléfono: </span>
              <span className="font-mono font-semibold tabular-nums text-[var(--text)]">
                {selected.phone?.trim() || "—"}
              </span>
            </p>
            <div className="mt-3 rounded-lg border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-2.5 py-2">
              <div className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">
                Servicio de transporte
              </div>
              <p className="mb-0 mt-1 text-[12px] font-semibold leading-snug text-[var(--text)]">
                {selected.transportServiceLabel?.trim() || "No indicó servicio al suscribirse"}
              </p>
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">
                Tramos
              </div>
              <ul className="m-0 mt-1.5 list-none space-y-2 p-0">
                {selected.tramos.map((tr) => (
                  <li
                    key={tr.stopId}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-[11px] leading-snug"
                  >
                    <div className="font-extrabold">
                      Tramo {tr.orden}: {tr.origenLine} → {tr.destinoLine}
                    </div>
                    <div
                      className={cn(
                        "mt-1 text-[10px] font-bold",
                        tr.status === "confirmed" ?
                          "text-[color-mix(in_oklab,var(--good)_85%,var(--muted))]"
                        : "text-[color-mix(in_oklab,var(--primary)_88%,var(--muted))]",
                      )}
                    >
                      {statusLabel(tr.status)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : subscribers.length === 0 ? (
          <p className="vt-muted px-1 py-2 text-[12px] leading-snug">
            Todavía no hay transportistas suscritos a esta hoja en la oferta pública.
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {subscribers.map((sub) => (
              <li key={sub.userId}>
                <button
                  type="button"
                  ref={(el) => {
                    rowRefs.current[sub.userId] = el;
                  }}
                  className={cn(
                    railItemClass,
                    hi && sub.userId === hi ?
                      "border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface))] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
                    : null,
                  )}
                  onClick={() => setSelected(sub)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-left text-[13px] font-extrabold leading-tight">{sub.displayName}</span>
                    <span className="shrink-0 text-[10px] font-bold text-[var(--muted)]">
                      {sub.tramos.length} tramo{sub.tramos.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {sub.transportServiceLabel ? (
                    <div className="mt-1 line-clamp-2 text-left text-[10px] text-[var(--muted)]">
                      <span className="font-extrabold">Servicio: </span>
                      {sub.transportServiceLabel}
                    </div>
                  ) : null}
                  <ChevronRight
                    size={16}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-45"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
