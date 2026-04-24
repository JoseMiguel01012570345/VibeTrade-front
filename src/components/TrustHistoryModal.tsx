import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import type { TrustHistoryEntry } from "../app/store/trustLedgerTypes";

function fmtWhen(ts: number) {
  return new Date(ts).toLocaleString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  entries: TrustHistoryEntry[];
  onClose: () => void;
  /** Mientras se obtiene el historial desde el API. */
  loading?: boolean;
};

export function TrustHistoryModal({
  open,
  title,
  subtitle,
  entries,
  onClose,
  loading = false,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    globalThis.addEventListener?.("keydown", onKey);
    return () => globalThis.removeEventListener?.("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trust-history-title"
      onMouseDown={onClose}
    >
      <div
        className="vt-modal flex max-h-[min(85vh,640px)] w-full max-w-[420px] flex-col overflow-hidden p-0"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <div id="trust-history-title" className="vt-modal-title">
              {title}
            </div>
            {subtitle ? (
              <p className="vt-muted mt-1 text-[12px] leading-snug">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="vt-btn vt-btn-ghost vt-btn-sm shrink-0 p-2"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading && entries.length === 0 ? (
            <p className="vt-muted py-6 text-center text-[13px] leading-snug">
              Cargando historial…
            </p>
          ) : entries.length === 0 ? (
            <p className="vt-muted py-6 text-center text-[13px] leading-snug">
              Todavía no hay movimientos registrados en la barra de confianza.
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <time
                      className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]"
                      dateTime={new Date(e.at).toISOString()}
                    >
                      {fmtWhen(e.at)}
                    </time>
                    <span
                      className={cn(
                        "text-sm font-black tabular-nums",
                        e.delta > 0 && "text-[color-mix(in_oklab,var(--good)_75%,var(--text))]",
                        e.delta < 0 && "text-[color-mix(in_oklab,var(--bad)_80%,var(--text))]",
                        e.delta === 0 && "text-[var(--muted)]",
                      )}
                    >
                      {e.delta > 0 ? "+" : ""}
                      {e.delta} pts
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-snug text-[var(--text)]">
                    {e.reason}
                  </p>
                  <p className="vt-muted mt-1 text-[11px]">
                    Saldo después:{" "}
                    <span className="font-bold text-[var(--text)] tabular-nums">
                      {e.balanceAfter}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
