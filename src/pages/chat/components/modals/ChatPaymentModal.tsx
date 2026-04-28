import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { CreditCard, X } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { cn } from "../../../../lib/cn";
import { postChatTextMessage } from "../../../../utils/chat/chatApi";
import {
  createStripePaymentIntent,
  getStripeConfig,
  listStripeCards,
  type StripeSavedCard,
} from "../../../../utils/payments/stripeApi";

type Props = {
  open: boolean;
  threadId: string;
  onClose: () => void;
  onPaymentSuccess: () => void;
};

export function ChatPaymentModal({
  open,
  threadId,
  onClose,
  onPaymentSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<StripeSavedCard[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const hasCards = cards.length > 0;
  const canPay = hasCards && !!selectedId.trim() && !busy && !loading;

  // Demo amount: 10.00 USD. (Se reemplaza en el feature real con total del acuerdo.)
  const payAmountMinor = 1000;
  const payCurrency = "usd";
  const payDescription = useMemo(
    () => `Pago demo chat ${threadId}`,
    [threadId],
  );

  useEffect(() => {
    if (!open) return;
    setSelectedId("");
    setLoading(true);
    void (async () => {
      try {
        await getStripeConfig(); // for friendly errors
        const cs = await listStripeCards();
        setCards(cs);
        if (cs.length > 0) setSelectedId(cs[0]?.id ?? "");
      } catch (e) {
        setCards([]);
        toast.error((e as Error)?.message ?? "No se pudieron cargar las tarjetas.");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

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
    <button
      type="button"
      className="vt-modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          "vt-modal flex max-h-[min(85vh,720px)] w-full max-w-[560px] flex-col overflow-hidden p-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-pay-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <div id="chat-pay-title" className="vt-modal-title flex items-center gap-2">
              <CreditCard size={18} aria-hidden /> Pagar
            </div>
            <p className="vt-muted mt-1 text-[12px] leading-snug">
              Elegí una tarjeta guardada para registrar el pago del chat (demo).
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
              Cargando tarjetas…
            </p>
          ) : !hasCards ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] p-3 text-[13px]">
              <div className="font-extrabold text-[var(--text)]">
                No hay tarjetas guardadas.
              </div>
              <div className="vt-muted mt-1 leading-snug">
                Para guardar una tarjeta: abrí tu perfil → “Configurar tarjetas de pago” → “Crear nueva tarjeta”.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="text-[12px] font-black uppercase tracking-wide text-[var(--muted)]">
                Tarjetas disponibles
              </div>
              <ul className="flex flex-col gap-2">
                {cards.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2">
                      <input
                        type="radio"
                        name="chat-pay-card"
                        value={c.id}
                        aria-label={`Seleccionar tarjeta terminada en ${c.last4}`}
                        checked={selectedId === c.id}
                        onChange={() => setSelectedId(c.id)}
                      />
                      <div className="min-w-0">
                        <div className="font-extrabold text-[var(--text)]">
                          {c.brand || "Card"} •••• {c.last4}
                        </div>
                        <div className="vt-muted text-[12px]">
                          Exp {String(c.expMonth).padStart(2, "0")}/{c.expYear}
                        </div>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="vt-modal-actions border-t border-[var(--border)] px-4 py-3">
          <button type="button" className="vt-btn vt-btn-ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            disabled={!canPay}
            onClick={async () => {
              const pm = selectedId.trim();
              if (!pm) return;
              setBusy(true);
              try {
                const cfg = await getStripeConfig();
                const r = await createStripePaymentIntent({
                  amountMinor: payAmountMinor,
                  currency: payCurrency,
                  description: payDescription,
                  paymentMethodId: pm,
                });

                // Si Stripe necesita autenticación, el backend devuelve clientSecret para completar.
                if (cfg.enabled && cfg.publishableKey) {
                  const stripe = await loadStripe(cfg.publishableKey);
                  if (stripe) {
                    const res = await stripe.confirmCardPayment(r.clientSecret);
                    if (res.error) {
                      toast.error(res.error.message ?? "No se pudo completar el pago.");
                      return;
                    }
                  }
                }

                try {
                  await postChatTextMessage(threadId, "Pago realizado.");
                } catch {
                  // El pago ya se completó: si falla la notificación, no bloqueamos el flujo.
                }

                toast.success("Pago registrado.");
                onPaymentSuccess();
                onClose();
              } catch (e) {
                toast.error((e as Error)?.message ?? "No se pudo registrar el pago.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Pagar
          </button>
        </div>
      </div>
    </button>,
    document.body,
  );
}

