import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { CreditCard, X } from "lucide-react";
import { cn } from "@shared/lib/cn";
import {
  createSetupIntent,
  getPaymentGatewayConfig,
  listSavedCards,
  type SavedCard,
} from "@features/payments";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PaymentGatewayConfigModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [simulatedMode, setSimulatedMode] = useState(true);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const reloadCards = async () => {
    setCardsLoading(true);
    try {
      setCards(await listSavedCards());
    } finally {
      setCardsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      try {
        const cfg = await getPaymentGatewayConfig();
        setEnabled(cfg.enabled);
        setSimulatedMode(cfg.simulatedMode ?? true);
        if (cfg.enabled) {
          await reloadCards();
        } else {
          setCards([]);
        }
      } catch {
        setEnabled(false);
        setSimulatedMode(true);
        setCards([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    globalThis.addEventListener?.("keydown", onKey);
    return () => globalThis.removeEventListener?.("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="vt-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-gw-title"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          "vt-modal flex max-h-[min(85vh,720px)] w-full max-w-[560px] flex-col overflow-hidden p-0",
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <div id="payment-gw-title" className="vt-modal-title flex items-center gap-2">
              <CreditCard size={18} aria-hidden /> Pagos (simulado)
            </div>
            <p className="vt-muted mt-1 text-[12px] leading-snug">
              Pasarela demo: activá una tarjeta de prueba para usarla en checkout.
            </p>
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
          {loading ? (
            <p className="vt-muted py-6 text-center text-[13px] leading-snug">
              Cargando configuración…
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] p-3">
                <div className="text-[12px] font-black uppercase tracking-wide text-[var(--muted)]">
                  Tarjetas guardadas
                </div>
                {simulatedMode ? (
                  <p className="vt-muted mt-2 text-[12px]">
                    Modo simulado ({enabled ? "activo" : "inactivo"}).
                  </p>
                ) : null}
                {cardsLoading ? (
                  <p className="vt-muted mt-2 text-[13px]">Cargando tarjetas…</p>
                ) : cards.length === 0 ? (
                  <p className="vt-muted mt-2 text-[13px]">
                    Todavía no hay tarjetas guardadas.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-2">
                    {cards.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="font-extrabold text-[var(--text)]">
                            {c.brand || "Card"} •••• {c.last4}
                          </div>
                          <div className="vt-muted text-[12px]">
                            Exp {String(c.expMonth).padStart(2, "0")}/{c.expYear}
                          </div>
                        </div>
                        <span className="vt-muted font-mono text-[11px]" title={c.id}>
                          {c.id}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="vt-modal-actions">
                  <button
                    type="button"
                    className="vt-btn"
                    disabled={setupBusy}
                    onClick={async () => {
                      if (!enabled) {
                        toast.error("Pagos no están activos en el servidor.");
                        return;
                      }
                      setSetupBusy(true);
                      try {
                        await createSetupIntent();
                        toast.success("Tarjeta demo activada.");
                        await reloadCards();
                      } catch (e) {
                        toast.error(
                          (e as Error)?.message ?? "No se pudo activar la tarjeta demo.",
                        );
                      } finally {
                        setSetupBusy(false);
                      }
                    }}
                  >
                    {setupBusy ? "Activando…" : "Activar tarjeta demo"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="vt-modal-actions border-t border-[var(--border)] px-4 py-3">
          <button type="button" className="vt-btn vt-btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
