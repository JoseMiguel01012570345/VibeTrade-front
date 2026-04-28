import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { CreditCard, X } from "lucide-react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { cn } from "../../lib/cn";
import {
  createStripeSetupIntent,
  getStripeConfig,
  listStripeCards,
  type StripeSavedCard,
} from "../../utils/payments/stripeApi";

type Props = {
  open: boolean;
  onClose: () => void;
};

function onlyDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}

function formatCardNumber(raw: string): string {
  // 19 max (algunas tarjetas), agrupado 4-4-4-4-3
  const d = onlyDigits(raw).slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExp(raw: string): string {
  const d = onlyDigits(raw).slice(0, 4); // MMYY
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function formatCvc(raw: string): string {
  // 4 max (Amex)
  return onlyDigits(raw).slice(0, 4);
}

function StripeCardSetupInner({
  clientSecret,
  onDone,
}: {
  clientSecret: string;
  onDone: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] p-3">
      <div className="text-[12px] font-black uppercase tracking-wide text-[var(--muted)]">
        Datos de tarjeta (Stripe)
      </div>
      <div className="mt-2">
        <PaymentElement />
      </div>
      <div className="vt-modal-actions mt-3">
        <button
          type="button"
          className="vt-btn"
          disabled={!stripe || !elements || busy}
          onClick={async () => {
            if (!stripe || !elements) return;
            setBusy(true);
            try {
              const r = await stripe.confirmSetup({
                elements,
                clientSecret,
                confirmParams: { return_url: globalThis.location?.href ?? "" },
                redirect: "if_required",
              });
              if (r.error) {
                toast.error(r.error.message ?? "No se pudo guardar la tarjeta.");
                return;
              }
              toast.success("Tarjeta guardada.");
              onDone();
            } finally {
              setBusy(false);
            }
          }}
        >
          Guardar tarjeta
        </button>
      </div>
    </div>
  );
}

export function PaymentGatewayConfigModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [_publishableKey, setPublishableKey] = useState<string | undefined>();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [cards, setCards] = useState<StripeSavedCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [manualNewCardOpen, setManualNewCardOpen] = useState(false);
  const [manualCard, setManualCard] = useState({
    name: "",
    number: "",
    exp: "",
    cvc: "",
  });

  useEffect(() => {
    if (!open) return;
    setClientSecret(null);
    setManualNewCardOpen(false);
    setLoading(true);
    void (async () => {
      try {
        const cfg = await getStripeConfig();
        setEnabled(cfg.enabled);
        setPublishableKey(cfg.publishableKey);
        if (cfg.enabled && cfg.publishableKey) {
          setStripePromise(loadStripe(cfg.publishableKey));
        } else {
          setStripePromise(null);
        }
        if (cfg.enabled) {
          setCardsLoading(true);
          try {
            setCards(await listStripeCards());
          } finally {
            setCardsLoading(false);
          }
        } else {
          setCards([]);
        }
      } catch (e) {
        setEnabled(false);
        setPublishableKey(undefined);
        setStripePromise(null);
        setCards([]);
        // Si no se puede obtener config, igual dejamos la UI abierta para que el error aparezca al intentar guardar.
      } finally {
        setLoading(false);
      }
    })();
  }, [open, onClose]);

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
              <CreditCard size={18} aria-hidden /> Pagos (demo)
            </div>
            <p className="vt-muted mt-1 text-[12px] leading-snug">
              Stripe: guardar tarjetas (SetupIntent) para usarlas después.
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
                  Tarjetas guardadas (Stripe)
                </div>
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
                    onClick={async () => {
                      if (!enabled) {
                        setManualNewCardOpen(true);
                        return;
                      }
                      try {
                        const r = await createStripeSetupIntent();
                        setClientSecret(r.clientSecret);
                      } catch (e) {
                        toast.error((e as Error)?.message ?? "No se pudo iniciar el guardado de tarjeta.");
                      }
                    }}
                  >
                    Crear nueva tarjeta
                  </button>
                </div>
              </div>

              {clientSecret && stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret, appearance: { theme: "stripe" } }}
                >
                  <StripeCardSetupInner
                    clientSecret={clientSecret}
                    onDone={() => {
                      setClientSecret(null);
                      void (async () => {
                        try {
                          setCards(await listStripeCards());
                        } catch {
                          /* ignore */
                        }
                      })();
                    }}
                  />
                </Elements>
              ) : null}

              {manualNewCardOpen ? (
                <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] p-3">
                  <div className="text-[12px] font-black uppercase tracking-wide text-[var(--muted)]">
                    Nueva tarjeta
                  </div>
                  <div className="mt-2 grid grid-cols-12 gap-2">
                    <label className="col-span-12">
                      <div className="text-[12px] font-bold text-[var(--muted)]">Nombre</div>
                      <input
                        className="vt-input mt-1 w-full"
                        value={manualCard.name}
                        onChange={(e) => setManualCard((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Nombre en la tarjeta"
                      />
                    </label>
                    <label className="col-span-12">
                      <div className="text-[12px] font-bold text-[var(--muted)]">Número</div>
                      <input
                        className="vt-input mt-1 w-full font-mono"
                        value={manualCard.number}
                        onChange={(e) =>
                          setManualCard((p) => ({
                            ...p,
                            number: formatCardNumber(e.target.value),
                          }))
                        }
                        inputMode="numeric"
                        placeholder="4242 4242 4242 4242"
                      />
                    </label>
                    <label className="col-span-6">
                      <div className="text-[12px] font-bold text-[var(--muted)]">Exp</div>
                      <input
                        className="vt-input mt-1 w-full font-mono"
                        value={manualCard.exp}
                        onChange={(e) =>
                          setManualCard((p) => ({ ...p, exp: formatExp(e.target.value) }))
                        }
                        placeholder="MM/AA"
                      />
                    </label>
                    <label className="col-span-6">
                      <div className="text-[12px] font-bold text-[var(--muted)]">CVC</div>
                      <input
                        className="vt-input mt-1 w-full font-mono"
                        value={manualCard.cvc}
                        onChange={(e) =>
                          setManualCard((p) => ({ ...p, cvc: formatCvc(e.target.value) }))
                        }
                        inputMode="numeric"
                        placeholder="123"
                      />
                    </label>
                  </div>
                  <div className="vt-modal-actions mt-3">
                    <button
                      type="button"
                      className="vt-btn vt-btn-ghost"
                      onClick={() => setManualNewCardOpen(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="vt-btn"
                      onClick={async () => {
                        try {
                          // Intentar guardar en backend: si Stripe no está habilitado, aquí debe fallar.
                          await createStripeSetupIntent();
                          toast.success("Tarjeta guardada.");
                          setManualNewCardOpen(false);
                        } catch (e) {
                          toast.error((e as Error)?.message ?? "No se pudo guardar la tarjeta.");
                        }
                      }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ) : null}
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

