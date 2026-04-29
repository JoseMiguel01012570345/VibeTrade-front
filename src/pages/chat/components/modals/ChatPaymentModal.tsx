import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { CreditCard, FileText, X } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { cn } from "../../../../lib/cn";
import { postChatTextMessage } from "../../../../utils/chat/chatApi";
import {
  createStripePaymentIntent,
  getStripeConfig,
  listStripeCards,
  type StripeSavedCard,
} from "../../../../utils/payments/stripeApi";
import type { TradeAgreement } from "../../domain/tradeAgreementTypes";
import { previewPaymentForAcceptedAgreement } from "../../utils/chatPaymentAmountPreview";

type Props = {
  open: boolean;
  threadId: string;
  /** Solo acuerdos aceptados en el hilo (el comprador elige cuál pagar). */
  acceptedAgreements: TradeAgreement[];
  onClose: () => void;
  onPaymentSuccess: () => void;
};

function formatMoney(amountMinor: number, currency: string) {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export function ChatPaymentModal({
  open,
  threadId,
  acceptedAgreements,
  onClose,
  onPaymentSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<StripeSavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [selectedAgreementId, setSelectedAgreementId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const previewById = useMemo(() => {
    const m = new Map<
      string,
      ReturnType<typeof previewPaymentForAcceptedAgreement>
    >();
    for (const ag of acceptedAgreements) {
      m.set(ag.id, previewPaymentForAcceptedAgreement(ag));
    }
    return m;
  }, [acceptedAgreements]);

  const selectedPreview =
    selectedAgreementId.trim().length > 0
      ? previewById.get(selectedAgreementId.trim())
      : undefined;

  const hasCards = cards.length > 0;
  const canPay =
    hasCards &&
    !!selectedCardId.trim() &&
    selectedPreview?.ok === true &&
    !busy &&
    !loading;

  useEffect(() => {
    if (!open) return;
    setSelectedCardId("");
    setSelectedAgreementId("");
    setLoading(true);
    void (async () => {
      try {
        await getStripeConfig();
        const cs = await listStripeCards();
        setCards(cs);
        if (cs.length > 0) setSelectedCardId(cs[0]?.id ?? "");
      } catch (e) {
        setCards([]);
        toast.error(
          (e as Error)?.message ?? "No se pudieron cargar las tarjetas.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  /** Una sola opción: seleccionada por defecto al abrir. */
  useEffect(() => {
    if (!open || acceptedAgreements.length !== 1) return;
    const id = acceptedAgreements[0]?.id?.trim();
    if (id) setSelectedAgreementId(id);
  }, [open, acceptedAgreements]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    globalThis.addEventListener?.("keydown", onKey);
    return () => globalThis.removeEventListener?.("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const noAgreements = acceptedAgreements.length === 0;

  return createPortal(
    <button type="button" className="vt-modal-backdrop" onMouseDown={onClose}>
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
            <div
              id="chat-pay-title"
              className="vt-modal-title flex items-center gap-2"
            >
              <CreditCard size={18} aria-hidden /> Pagar
            </div>
            <p className="vt-muted mt-1 text-[12px] leading-snug">
              Elegí el acuerdo y el monto a pagar; después la tarjeta guardada.
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
          {noAgreements ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] p-3 text-[13px]">
              <div className="font-extrabold text-[var(--text)]">
                No hay acuerdos aceptados.
              </div>
              <div className="vt-muted mt-1 leading-snug">
                El comercio debe emitir un acuerdo y vos aceptarlo antes de pagar
                desde el chat.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[12px] font-black uppercase tracking-wide text-[var(--muted)]">
                  <FileText size={14} aria-hidden /> 1. Acuerdo y monto
                </div>
                <ul className="flex flex-col gap-2">
                  {acceptedAgreements.map((ag) => {
                    const pv = previewById.get(ag.id);
                    const checked = selectedAgreementId === ag.id;
                    return (
                      <li key={ag.id}>
                        <label
                          className={cn(
                            "flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-2.5",
                            checked
                              ? "border-[color-mix(in_oklab,var(--primary)_45%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]"
                              : "border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))]",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="radio"
                              name="chat-pay-agreement"
                              value={ag.id}
                              className="mt-0.5"
                              aria-label={`Acuerdo ${ag.title}`}
                              checked={checked}
                              onChange={() => setSelectedAgreementId(ag.id)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-[var(--text)]">
                                {(ag.title ?? "").trim() || "Acuerdo"}
                              </div>
                              {pv === undefined ? (
                                <div className="vt-muted mt-0.5 text-[12px]">—</div>
                              ) : pv.ok ? (
                                <>
                                  <div className="mt-0.5 text-[13px] font-bold text-[var(--primary)]">
                                    Total a pagar ahora:{" "}
                                    {formatMoney(pv.amountMinor, pv.currency)}
                                  </div>
                                  {pv.summaryLines.length > 0 ? (
                                    <ul className="vt-muted mt-1 list-inside list-disc text-[11px] leading-snug">
                                      {pv.summaryLines.map((line, i) => (
                                        <li key={`${ag.id}-s${i}`}>{line}</li>
                                      ))}
                                    </ul>
                                  ) : null}
                                </>
                              ) : (
                                <div className="vt-muted mt-0.5 text-[12px] leading-snug">
                                  {pv.reason}
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div>
                <div className="mb-2 text-[12px] font-black uppercase tracking-wide text-[var(--muted)]">
                  2. Tarjeta
                </div>
                {loading ? (
                  <p className="vt-muted py-4 text-center text-[13px] leading-snug">
                    Cargando tarjetas…
                  </p>
                ) : !hasCards ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] p-3 text-[13px]">
                    <div className="font-extrabold text-[var(--text)]">
                      No hay tarjetas guardadas.
                    </div>
                    <div className="vt-muted mt-1 leading-snug">
                      Para guardar una tarjeta: Perfil → “Configurar tarjetas de
                      pago” → “Crear nueva tarjeta”.
                    </div>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {cards.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] px-3 py-2">
                          <input
                            type="radio"
                            name="chat-pay-card"
                            value={c.id}
                            aria-label={`Seleccionar tarjeta terminada en ${c.last4}`}
                            checked={selectedCardId === c.id}
                            onChange={() => setSelectedCardId(c.id)}
                          />
                          <div className="min-w-0">
                            <div className="font-extrabold text-[var(--text)]">
                              {c.brand || "Card"} •••• {c.last4}
                            </div>
                            <div className="vt-muted text-[12px]">
                              Exp {String(c.expMonth).padStart(2, "0")}/
                              {c.expYear}
                            </div>
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="vt-modal-actions border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            className="vt-btn vt-btn-ghost"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            disabled={!canPay}
            onClick={async () => {
              const pm = selectedCardId.trim();
              if (!pm || selectedPreview?.ok !== true) return;
              setBusy(true);
              try {
                const cfg = await getStripeConfig();
                const desc = `Pago «${selectedPreview.title}» · chat ${threadId}`;
                const r = await createStripePaymentIntent({
                  amountMinor: selectedPreview.amountMinor,
                  currency: selectedPreview.currency,
                  description: desc,
                  paymentMethodId: pm,
                });

                if (cfg.enabled && cfg.publishableKey) {
                  const stripe = await loadStripe(cfg.publishableKey);
                  if (stripe) {
                    const res = await stripe.confirmCardPayment(r.clientSecret);
                    if (res.error) {
                      toast.error(
                        res.error.message ?? "No se pudo completar el pago.",
                      );
                      return;
                    }
                  }
                }

                try {
                  await postChatTextMessage(
                    threadId,
                    `Pago realizado: ${formatMoney(selectedPreview.amountMinor, selectedPreview.currency)} · ${selectedPreview.title}.`,
                  );
                } catch {
                  /* el cobro ya ok */
                }

                toast.success("Pago registrado.");
                onPaymentSuccess();
                onClose();
              } catch (e) {
                toast.error(
                  (e as Error)?.message ?? "No se pudo registrar el pago.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {selectedPreview?.ok
              ? `Pagar ${formatMoney(selectedPreview.amountMinor, selectedPreview.currency)}`
              : "Pagar"}
          </button>
        </div>
      </div>
    </button>,
    document.body,
  );
}
