import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { CreditCard, FileDown, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { cn } from "../../../../lib/cn";
import { useNavigate } from "react-router-dom";
import { postChatTextMessage } from "../../../../utils/chat/chatApi";
import {
  executeAgreementCurrencyPayment,
  fetchAgreementCheckoutBreakdown,
  fetchAgreementPaymentStatuses,
  type AgreementCheckoutBreakdownApi,
  type AgreementPaymentStatusApi,
} from "../../../../utils/chat/agreementCheckoutApi";
import {
  getStripeConfig,
  listStripeCards,
  type StripeSavedCard,
} from "../../../../utils/payments/stripeApi";
import { useAppStore } from "../../../../app/store/useAppStore";
import type { TradeAgreement } from "../../domain/tradeAgreementTypes";
import {
  minorToMajor,
  paymentFeeLabels,
  stripeMinorDecimals,
} from "../../domain/paymentFeePolicy";
import { downloadPaymentCheckoutInformePdf } from "../../utils/paymentCheckoutPdfDownload";
import { collectAgreementInformePreviewEntries } from "../../utils/tradeAgreementPdfText";
import { ProtectedMediaImg } from "../../../../components/media/ProtectedMediaImg";
import {
  VtSelect,
  type VtSelectOption,
} from "../../../../components/VtSelect";

type Props = {
  open: boolean;
  threadId: string;
  agreements: TradeAgreement[];
  onClose: () => void;
  onPaymentFullySettled?: () => void;
};

function fmt(amountMinor: number, curLower: string): string {
  const maj = minorToMajor(amountMinor, curLower);
  const frac = stripeMinorDecimals(curLower);
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: curLower.slice(0, 3).toUpperCase(),
      minimumFractionDigits: frac,
      maximumFractionDigits: frac,
    }).format(maj);
  } catch {
    return `${maj.toFixed(frac)} ${curLower.toUpperCase()}`;
  }
}

function currencyPaid(
  statuses: AgreementPaymentStatusApi[],
  curLower: string,
): boolean {
  return statuses.some(
    (x) =>
      x.status === "succeeded" &&
      x.currency.trim().toLowerCase() === curLower.trim().toLowerCase(),
  );
}

export function ChatPaymentModal({
  open,
  threadId,
  agreements,
  onClose,
  onPaymentFullySettled,
}: Props) {
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);

  const [busyInit, setBusyInit] = useState(false);
  const [busyPay, setBusyPay] = useState(false);

  const [agreementId, setAgreementId] = useState<string>("");
  const [breakdown, setBreakdown] = useState<AgreementCheckoutBreakdownApi | null>(
    null,
  );
  const [statuses, setStatuses] = useState<AgreementPaymentStatusApi[]>([]);
  const [cards, setCards] = useState<StripeSavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");

  /** Reintentos mismos montos mismo intento cliente. */
  const [idemByCurrency] = useState(() => ({
    refs: {} as Record<string, string>,
  }));

  const [acceptedInforme, setAcceptedInforme] = useState(false);
  const settledNotifiedAgreementIdRef = useRef<string | null>(null);

  const selectedAgreement = useMemo(
    () => agreements.find((a) => a.id === agreementId) ?? agreements[0] ?? null,
    [agreementId, agreements],
  );

  const previews = useMemo(
    () => (selectedAgreement ? collectAgreementInformePreviewEntries(selectedAgreement) : []),
    [selectedAgreement],
  );

  const agreementOptions = useMemo<VtSelectOption[]>(
    () =>
      agreements.map((a) => ({
        value: a.id,
        label: (a.title ?? "").trim() || "(sin título)",
      })),
    [agreements],
  );

  const cardOptions = useMemo<VtSelectOption[]>(
    () =>
      cards.map((c) => ({
        value: c.id,
        label: `${c.brand} •••• ${c.last4}`,
      })),
    [cards],
  );

  const pendingCurrencies = useMemo(() => {
    const bc = breakdown?.byCurrency ?? [];
    const out: string[] = [];
    for (const b of bc) {
      const c = b.currencyLower.trim().toLowerCase();
      if (!currencyPaid(statuses, c)) out.push(c);
    }
    return out;
  }, [breakdown?.byCurrency, statuses]);

  const allPaid =
    breakdown !== null &&
    breakdown.ok &&
    breakdown.byCurrency.length > 0 &&
    pendingCurrencies.length === 0;

  const reloadCheckout = useCallback(
    async (opts?: { skipBusyToggle?: boolean }) => {
      const ag = selectedAgreement ?? agreements[0];
      if (!ag) {
        setBreakdown(null);
        setStatuses([]);
        return;
      }
      const skipBusy = opts?.skipBusyToggle === true;
      if (!skipBusy) setBusyInit(true);
      setBreakdown(null);
      setStatuses([]);
      try {
        const [bd, ps] = await Promise.all([
          fetchAgreementCheckoutBreakdown(threadId, ag.id),
          fetchAgreementPaymentStatuses(threadId, ag.id),
        ]);
        setBreakdown(bd);
        setStatuses(ps);
      } catch (e) {
        setBreakdown(null);
        setStatuses([]);
        toast.error(
          (e as Error)?.message ?? "No se pudo cargar el informe de pago.",
        );
      } finally {
        if (!skipBusy) setBusyInit(false);
      }
    },
    [threadId, selectedAgreement, agreements],
  );

  useEffect(() => {
    if (!open) {
      settledNotifiedAgreementIdRef.current = null;
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !breakdown?.ok) return;
    if (!breakdown.byCurrency.length) return;
    const settled = breakdown.byCurrency.every((bc) =>
      currencyPaid(statuses, bc.currencyLower),
    );
    if (!settled) return;

    const aid = (selectedAgreement?.id ?? agreementId ?? "").trim();
    if (!aid) return;
    if (settledNotifiedAgreementIdRef.current === aid) return;
    settledNotifiedAgreementIdRef.current = aid;
    onPaymentFullySettled?.();
  }, [open, breakdown, statuses, onPaymentFullySettled, selectedAgreement?.id, agreementId]);

  useEffect(() => {
    if (!open || !agreements.length) return;
    if (!agreementId || !agreements.some((x) => x.id === agreementId))
      setAgreementId(agreements[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agreements]);

  useEffect(() => {
    if (!open) return;
    setAcceptedInforme(false);
    setBusyInit(true);
    void (async () => {
      try {
        await getStripeConfig();
        const cs = await listStripeCards();
        setCards(cs);
        if (cs[0]?.id) setSelectedCardId(cs[0].id);
        else setSelectedCardId("");
      } catch {
        setCards([]);
      }
      await reloadCheckout({ skipBusyToggle: true });
    })().finally(() => setBusyInit(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agreementId]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    globalThis.addEventListener?.("keydown", k);
    return () => globalThis.removeEventListener?.("keydown", k);
  }, [open, onClose]);

  if (!open) return null;

  const hasAgreement = agreements.length > 0;
  const informeReady =
    breakdown !== null &&
    breakdown.ok === true &&
    breakdown.byCurrency.length > 0;

  async function handlePayCurrency(curLower: string) {
    const ag = selectedAgreement ?? agreements[0];
    const pmId = selectedCardId.trim();
    if (!ag || !pmId) {
      toast.error("Seleccioná una tarjeta guardada.");
      return;
    }
    if (!acceptedInforme) {
      toast.error("Confirmá que leíste el informe de montos antes de pagar.");
      return;
    }
    let ik = idemByCurrency.refs[curLower]?.trim();
    if (!ik || ik.length < 8)
      ik = crypto.randomUUID();
    idemByCurrency.refs[curLower] = ik;

    setBusyPay(true);
    try {
      const cfg = await getStripeConfig();
      const r = await executeAgreementCurrencyPayment({
        threadId,
        agreementId: ag.id,
        currency: curLower,
        paymentMethodId: pmId,
        idempotencyKey: ik,
      });

      if (!r.accepted && (r.errorCode === "stripe_no_customer")) {
        toast.error(
          r.stripeErrorMessage ?? "Debés tener un cliente Stripe (tarjetas en perfil).",
        );
        return;
      }
      if (!r.accepted && (r.errorCode === "checkout_invalid")) {
        toast.error(
          r.stripeErrorMessage ?? "Los montos ya no aplican.",
        );
        await reloadCheckout();
        return;
      }

      const needs = (r.clientSecretForConfirmation ?? "").trim();
      if (
        !r.succeeded &&
        needs &&
        cfg.enabled &&
        (cfg.publishableKey ?? "").trim()
      ) {
        const stripe = await loadStripe(cfg.publishableKey!);
        const res = await stripe?.confirmCardPayment(needs);
        if (res?.error) {
          toast.error(res.error.message ?? "No se pudo autenticar el pago.");
          await reloadCheckout();
          return;
        }
      } else if (!r.succeeded) {
        if ((r.stripeErrorMessage ?? "").trim())
          toast.error(r.stripeErrorMessage!.trim());
        await reloadCheckout();
        return;
      }

      toast.success(`Pago en ${curLower.toUpperCase()} registrado.`);
      await reloadCheckout();
      try {
        await postChatTextMessage(
          threadId,
          `Pago registrado (${curLower.toUpperCase()}).`,
        );
      } catch {
        /* noop */
      }
    } catch (e) {
      toast.error((e as Error)?.message ?? "No se pudo completar el pago.");
    } finally {
      setBusyPay(false);
    }
  }

  async function handlePdfDownload() {
    const ag = selectedAgreement ?? agreements[0];
    if (!ag || !breakdown || busyInit) return;
    try {
      await downloadPaymentCheckoutInformePdf(ag, breakdown, threadId);
    } catch (e) {
      toast.error((e as Error)?.message ?? "No se pudo generar el PDF.");
    }
  }

  return createPortal(
    <button
      type="button"
      className="vt-modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          "vt-modal flex max-h-[min(88vh,780px)] w-full max-w-[560px] flex-col overflow-hidden p-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-pay-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <div
              id="chat-pay-title"
              className="vt-modal-title flex items-center gap-2"
            >
              <CreditCard size={18} aria-hidden /> Pago del acuerdo
            </div>
            <p className="vt-muted mt-1 text-[12px] leading-snug">
              Clima {paymentFeeLabels.climateRateDisplay} sobre subtotal más estimación Stripe (
              {paymentFeeLabels.stripePctDisplay}). Un cobro por moneda agrupando mercadería,
              servicios y tramos incluidos.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {!hasAgreement ?
            <p className="text-[13px] text-[var(--text)] leading-snug">
              No hay un acuerdo aceptado en este chat. El vendedor debe emitir uno y vos aceptarlo
              antes de pagar aquí.
            </p>
          : <>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                  Acuerdo
                </span>
                <VtSelect
                  value={agreementId}
                  onChange={(value) => {
                    setAgreementId(value);
                    setAcceptedInforme(false);
                  }}
                  options={agreementOptions}
                  listPortal
                  ariaLabel="Seleccionar acuerdo"
                  buttonClassName="min-h-10 bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] border-[color-mix(in_oklab,var(--border)_90%,transparent)] shadow-[inset_0_1px_0_rgba(2,6,23,0.55)]"
                />
              </label>

              {busyInit ?
                <div
                  className="flex flex-col items-center justify-center gap-3 py-10"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <Loader2
                    className="h-9 w-9 animate-spin text-[var(--primary)]"
                    aria-hidden
                  />
                  <p className="vt-muted text-center text-[13px] leading-snug">
                    Cargando tarjetas, acuerdos y desglose de pago…
                  </p>
                </div>
              : breakdown && !breakdown.ok ?
                <div className="rounded-2xl border border-[color-mix(in_oklab,var(--bad)_42%,var(--border))] bg-[color-mix(in_oklab,var(--bad)_10%,var(--surface))] p-3 text-[13px] leading-snug">
                  {breakdown.errors.map((e) => (
                    <div key={e}>• {e}</div>
                  ))}
                </div>
              : breakdown && breakdown.ok && breakdown.byCurrency.length === 0 ?
                <div className="vt-muted text-[13px]">Sin montos a cobrar en este momento.</div>
              : informeReady ?
                <>
                  <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
                    <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                      Informe
                    </div>
                    <div className="mt-2 space-y-3">
                      {breakdown.byCurrency.map((bc) => {
                        const c = bc.currencyLower;
                        const paid = currencyPaid(statuses, c);
                        return (
                          <div
                            key={c}
                            className="rounded-xl border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-[13px] font-black">
                                Moneda {c.toUpperCase()}{paid ?
                                  <span className="vt-muted ml-2 text-[11px] font-bold">
                                    — cobro OK
                                  </span>
                                : null}
                              </div>
                              <div className="font-mono text-[13px] font-bold">
                                {fmt(bc.totalMinor, c)}
                              </div>
                            </div>
                            <div className="vt-muted mt-1 grid gap-0.5 text-[12px]">
                              <div>Subtotal: {fmt(bc.subtotalMinor, c)} · Climate{" "}
                                {fmt(bc.climateMinor, c)}{" "}
                                · Tarifa est. Stripe {fmt(bc.stripeFeeMinor, c)}
                              </div>
                            </div>
                            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12px] text-[var(--text)] opacity-92">
                              {bc.lines.map((ln, ix) => (
                                <li key={`${ln.label}-${ix}`}>
                                  {ln.label} — <span className="font-mono">{fmt(ln.amountMinor, c)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {previews.length > 0 ?
                    <section>
                      <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                        Previsualización de adjuntos
                      </div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {previews.map((p) =>
                          p.kind === "image" ?
                            <div
                              key={p.url}
                              className="overflow-hidden rounded-xl border border-[var(--border)]"
                            >
                              <div className="bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] px-2 py-1 text-[11px] font-bold leading-tight">
                                {p.label}
                              </div>
                              <ProtectedMediaImg
                                src={p.url}
                                alt=""
                                wrapperClassName="aspect-[4/3] w-full bg-[var(--surface)]"
                                className="max-h-[180px] w-full object-contain"
                              />
                            </div>
                          : (
                            <a
                              key={p.url}
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] p-3 text-[13px] font-semibold text-[var(--primary)] underline"
                            >
                              {p.label} — abrir documento / enlace
                            </a>
                          ),
                        )}
                      </div>
                    </section>
                  : null}

                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] p-3 text-[13px] leading-snug">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={acceptedInforme || allPaid}
                      onChange={(e) => setAcceptedInforme(e.target.checked)}
                    />
                    <span>
                      Confirmé el desglose de montos, conceptos incluidos y adjuntos declarados por el
                      vendedor antes de cargar cobros Stripe.
                    </span>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="vt-btn inline-flex items-center gap-2"
                      disabled={busyInit}
                      onClick={() => void handlePdfDownload()}
                    >
                      <FileDown size={16} aria-hidden />
                      Descargar PDF informe (+ QR enlaces solo en archivo)
                    </button>
                  </div>
                </>
              : !busyInit && !breakdown ?
                <p className="vt-muted text-[13px] leading-snug">
                  No pudimos obtener el informe desde el servidor. Revisa la conexión o volvé a intentar más
                  tarde.
                </p>
              : null}

              {!allPaid && breakdown?.ok ?
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost w-full justify-center text-[13px]"
                  onClick={() =>
                    nav(
                      `/profile/${encodeURIComponent(me.id)}/account?stripeCards=1`,
                    )
                  }
                >
                  Abrir configuración de tarjetas en el perfil
                </button>
              : null}
            </>
          }
        </div>

        <div className="vt-modal-actions flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3">
          {allPaid ?
            <div className="rounded-xl px-3 py-2 text-[13px] font-bold text-emerald-600">
              Cobros listos en todas las monedas necesarias del acuerdo.
            </div>
          : null}

          {!allPaid && hasAgreement && !cards.length ?
            <button
              type="button"
              className="vt-btn vt-btn-primary w-full sm:ml-auto sm:w-auto"
              onClick={() =>
                nav(
                  `/profile/${encodeURIComponent(me.id)}/account?stripeCards=1`,
                )
              }
            >
              Ir al perfil a guardar tarjeta
            </button>
          : null}

          {!allPaid &&
          hasAgreement &&
          cards.length > 0 &&
          pendingCurrencies.length > 0 ?
            <div className="flex flex-col gap-3">
              {pendingCurrencies.map((cur) => {
                const curOk = cur.trim().length >= 3;
                const payDisabled =
                  busyPay ||
                  !acceptedInforme ||
                  !selectedCardId.trim() ||
                  !curOk;
                const retryDisabled = busyPay || !curOk || !acceptedInforme;
                return (
                  <div
                    key={cur}
                    className="flex flex-col gap-2 rounded-xl border border-[color-mix(in_oklab,var(--border)_88%,transparent)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] p-2.5 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-2"
                  >
                    <VtSelect
                      className="min-w-0 w-full sm:flex-1 sm:min-w-[200px]"
                      value={selectedCardId}
                      onChange={setSelectedCardId}
                      options={cardOptions}
                      listPortal
                      ariaLabel={`Tarjeta para cobro en ${cur.toUpperCase()}`}
                      buttonClassName="min-h-10 border-[color-mix(in_oklab,var(--border)_90%,transparent)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] shadow-[inset_0_1px_0_rgba(2,6,23,0.55)]"
                    />
                    <div className="flex flex-wrap gap-2 sm:ml-auto sm:items-center sm:justify-end">
                      <button
                        type="button"
                        className="vt-btn shrink-0"
                        disabled={payDisabled}
                        title={
                          pendingCurrencies.length > 1 ?
                            "Un cobro por moneda; podés completar las demás después."
                          : undefined
                        }
                        onClick={() => void handlePayCurrency(cur)}
                      >
                        {busyPay ?
                          "Procesando…"
                        : `Pagar ${cur.toUpperCase()}`}
                      </button>
                      <button
                        type="button"
                        className="vt-btn vt-btn-ghost shrink-0 border border-[var(--border)] px-4 py-2 shadow-none"
                        disabled={retryDisabled}
                        onClick={() => void handlePayCurrency(cur)}
                      >
                        Reintentar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          : null}

          <button
            type="button"
            className="vt-btn vt-btn-ghost order-last min-h-10 w-full justify-center px-5 py-2.5 no-underline border border-[color-mix(in_oklab,var(--border)_80%,transparent)] sm:w-auto sm:self-end"
            onClick={onClose}
            disabled={busyPay}
          >
            Cerrar
          </button>
        </div>
      </div>
    </button>,
    document.body,
  );
}
