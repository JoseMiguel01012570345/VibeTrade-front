import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import { CreditCard, FileDown, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { cn } from "../../../../lib/cn";
import { useNavigate } from "react-router-dom";
import {
  executeAgreementCurrencyPayment,
  fetchAgreementCheckoutBreakdown,
  fetchAgreementPaymentStatuses,
  type AgreementCheckoutBreakdownApi,
  type AgreementPaymentStatusApi,
} from "../../../../utils/chat/agreementCheckoutApi";
import {
  listAgreementServicePayments,
  type AgreementServicePaymentApi,
} from "../../../../utils/chat/agreementServiceEvidenceApi";
import {
  getStripeConfig,
  listStripeCards,
  type StripeSavedCard,
} from "../../../../utils/payments/stripeApi";
import {
  beginChatPaymentExecute,
  endChatPaymentExecute,
} from "../../../../utils/chat/chatRealtime";
import { useAppStore } from "../../../../app/store/useAppStore";
import type { TradeAgreement } from "../../domain/tradeAgreementTypes";
import {
  agreementDeclaresMerchandise,
  agreementDeclaresService,
  normalizeAgreementServices,
} from "../../domain/tradeAgreementTypes";
import {
  minorToMajor,
  paymentFeeLabels,
  stripeMinorDecimals,
} from "../../domain/paymentFeePolicy";
import { downloadPaymentCheckoutInformePdf } from "../../utils/paymentCheckoutPdfDownload";
import { collectAgreementInformePreviewEntries } from "../../utils/tradeAgreementPdfText";
import { STRIPE_PRICING_PAGE_URL } from "../../domain/stripePricingLinks";
import { ProtectedMediaImg } from "../../../../components/media/ProtectedMediaImg";
import {
  VtSelect,
  type VtSelectOption,
} from "../../../../components/VtSelect";
import { VtMultiSelect } from "../../../../components/VtMultiSelect";

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

function recurrenceSlotKey(serviceItemId: string, month: number, day: number): string {
  return `${serviceItemId}:${month}-${day}`;
}

/** Todas las entradas de recurrencia del acuerdo tienen un pago registrado. */
function computeAllSlotsPaid(
  agreement: TradeAgreement,
  paidKeys: ReadonlySet<string>,
): boolean {
  const items = normalizeAgreementServices(agreement);
  if (items.length === 0) return false;
  for (const sv of items) {
    for (const e of sv.recurrenciaPagos?.entries ?? []) {
      if (!paidKeys.has(recurrenceSlotKey(sv.id, e.month, e.day))) return false;
    }
  }
  return true;
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
  const busyPayRef = useRef(false);
  busyPayRef.current = busyPay;

  const [agreementId, setAgreementId] = useState<string>("");
  const [breakdown, setBreakdown] = useState<AgreementCheckoutBreakdownApi | null>(
    null,
  );
  const [statuses, setStatuses] = useState<AgreementPaymentStatusApi[]>([]);
  const [servicePaymentsPaid, setServicePaymentsPaid] = useState<
    AgreementServicePaymentApi[]
  >([]);
  /** Solo true tras un refresh OK desde el servidor (lista service-payments); no usar antes de esa respuesta. */
  const [allRecurrencesPaidVerified, setAllRecurrencesPaidVerified] = useState(false);
  const [cards, setCards] = useState<StripeSavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");

  /** Reintentos mismos montos mismo intento cliente. */
  const [idemByCurrency] = useState(() => ({
    refs: {} as Record<string, string>,
  }));

  const [acceptedInforme, setAcceptedInforme] = useState(false);
  const [feePolicyQrDataUrl, setFeePolicyQrDataUrl] = useState<string | null>(null);
  const settledNotifiedAgreementIdRef = useRef<string | null>(null);

  const selectedAgreement = useMemo(
    () => agreements.find((a) => a.id === agreementId) ?? agreements[0] ?? null,
    [agreementId, agreements],
  );

  const serviceOnlyAgreement = useMemo(() => {
    if (!selectedAgreement) return false;
    return (
      agreementDeclaresService(selectedAgreement) &&
      !agreementDeclaresMerchandise(selectedAgreement)
    );
  }, [selectedAgreement]);

  const [selectedServiceEntriesByServiceId, setSelectedServiceEntriesByServiceId] =
    useState<Record<string, string[]>>({});

  const serviceItems = useMemo(
    () => (selectedAgreement ? normalizeAgreementServices(selectedAgreement) : []),
    [selectedAgreement],
  );

  const selectedServicePayments = useMemo(() => {
    const ids = new Set(serviceItems.map((s) => s.id));
    const out: Array<{ serviceItemId: string; entryKey: { month: number; day: number } }> =
      [];
    for (const [sid, keys] of Object.entries(selectedServiceEntriesByServiceId)) {
      if (!ids.has(sid)) continue;
      for (const k of keys) {
        const [mm, dd] = String(k).split("-").map((x) => Number(x));
        if (!Number.isFinite(mm) || !Number.isFinite(dd)) continue;
        out.push({ serviceItemId: sid, entryKey: { month: mm, day: dd } });
      }
    }
    return out;
  }, [selectedServiceEntriesByServiceId, serviceItems]);

  const paidSlotKeys = useMemo(() => {
    const s = new Set<string>();
    for (const p of servicePaymentsPaid) {
      s.add(recurrenceSlotKey(p.serviceItemId, p.entryMonth, p.entryDay));
    }
    return s;
  }, [servicePaymentsPaid]);

  const selectedServicePaymentsReady = useMemo(() => {
    if (!serviceOnlyAgreement) return true;
    if (serviceItems.length === 0) return false;
    if (allRecurrencesPaidVerified && !busyPay) return true;
    const ids = new Set(serviceItems.map((s) => s.id));
    if (selectedServicePayments.length === 0) return false;
    for (const sel of selectedServicePayments) {
      if (!ids.has(sel.serviceItemId)) return false;
      if (sel.entryKey.month <= 0 || sel.entryKey.day <= 0) return false;
    }
    return true;
  }, [
    serviceOnlyAgreement,
    serviceItems,
    selectedServicePayments,
    allRecurrencesPaidVerified,
    busyPay,
  ]);

  const selectedServicePaymentsRef = useRef(selectedServicePayments);
  const selectedServicePaymentsReadyRef = useRef(selectedServicePaymentsReady);
  selectedServicePaymentsRef.current = selectedServicePayments;
  selectedServicePaymentsReadyRef.current = selectedServicePaymentsReady;

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
    if (!serviceOnlyAgreement) {
      const bc = breakdown?.byCurrency ?? [];
      const out: string[] = [];
      for (const b of bc) {
        const c = b.currencyLower.trim().toLowerCase();
        if (!currencyPaid(statuses, c)) out.push(c);
      }
      return out;
    }
    const curSet = new Set<string>();
    for (const sv of serviceItems) {
      for (const e of sv.recurrenciaPagos?.entries ?? []) {
        const mon = (e.moneda ?? "").trim().toLowerCase();
        if (mon.length < 3) continue;
        if (!paidSlotKeys.has(recurrenceSlotKey(sv.id, e.month, e.day))) curSet.add(mon);
      }
    }
    return [...curSet];
  }, [serviceOnlyAgreement, breakdown?.byCurrency, statuses, serviceItems, paidSlotKeys]);

  const allPaid = serviceOnlyAgreement
    ? allRecurrencesPaidVerified && !busyPay
    : breakdown !== null &&
      breakdown.ok &&
      breakdown.byCurrency.length > 0 &&
      pendingCurrencies.length === 0;

  const paidRecurrenceSummaryLines = useMemo(() => {
    const lines: string[] = [];
    const byService = new Map<string, AgreementServicePaymentApi[]>();
    for (const p of servicePaymentsPaid) {
      const arr = byService.get(p.serviceItemId) ?? [];
      arr.push(p);
      byService.set(p.serviceItemId, arr);
    }
    for (const sv of serviceItems) {
      const pays = byService.get(sv.id);
      if (!pays?.length) continue;
      const title = (sv.tipoServicio ?? "").trim() || "Servicio";
      for (const p of pays) {
        lines.push(
          `${title}: Mes ${p.entryMonth} · Día ${p.entryDay} · ${fmt(p.amountMinor, p.currencyLower)}`,
        );
      }
    }
    return lines;
  }, [servicePaymentsPaid, serviceItems]);

  function informeCurrencyPaidDisplay(curLower: string): boolean {
    const c = curLower.trim().toLowerCase();
    if (!serviceOnlyAgreement) return currencyPaid(statuses, c);
    for (const sv of serviceItems) {
      for (const e of sv.recurrenciaPagos?.entries ?? []) {
        if ((e.moneda ?? "").trim().toLowerCase() !== c) continue;
        if (!paidSlotKeys.has(recurrenceSlotKey(sv.id, e.month, e.day))) return false;
      }
    }
    return true;
  }

  const reloadCheckout = useCallback(
    async (opts?: {
      skipBusyToggle?: boolean;
      /** Permite marcar todas las recurrencias cobradas mientras busyPay (post-cobro tras refresh). */
      allowVerifiedDuringBusyPay?: boolean;
    }) => {
      const ag = selectedAgreement ?? agreements[0];
      if (!ag) {
        setBreakdown(null);
        setStatuses([]);
        setServicePaymentsPaid([]);
        setAllRecurrencesPaidVerified(false);
        return;
      }
      const skipBusy = opts?.skipBusyToggle === true;
      if (!skipBusy) setBusyInit(true);
      setBreakdown(null);
      try {
        const [ps, sp] = await Promise.all([
          fetchAgreementPaymentStatuses(threadId, ag.id),
          listAgreementServicePayments(threadId, ag.id).catch(
            () => [] as AgreementServicePaymentApi[],
          ),
        ]);
        setStatuses(ps);
        setServicePaymentsPaid(sp);

        const pk = new Set(
          sp.map((p) => recurrenceSlotKey(p.serviceItemId, p.entryMonth, p.entryDay)),
        );
        const fullyPaid =
          serviceOnlyAgreement && computeAllSlotsPaid(ag, pk);
        const mayCommitVerified =
          !busyPayRef.current || opts?.allowVerifiedDuringBusyPay === true;
        setAllRecurrencesPaidVerified(mayCommitVerified && fullyPaid);
        if (fullyPaid) {
          setBreakdown(null);
          return;
        }

        if (serviceOnlyAgreement && !selectedServicePaymentsReadyRef.current) {
          setBreakdown(null);
          return;
        }

        const bd = await fetchAgreementCheckoutBreakdown(threadId, ag.id, {
          selectedServicePayments: serviceOnlyAgreement
            ? selectedServicePaymentsRef.current
            : undefined,
        });
        setBreakdown(bd);
      } catch (e) {
        const msg =
          (e as Error)?.message?.trim() || "No se pudo cargar el informe de pago.";
        setBreakdown({ ok: false, errors: [msg], byCurrency: [] });
        setStatuses([]);
        setServicePaymentsPaid([]);
        setAllRecurrencesPaidVerified(false);
        toast.error(msg);
      } finally {
        if (!skipBusy) setBusyInit(false);
      }
    },
    [threadId, selectedAgreement, agreements, serviceOnlyAgreement],
  );

  useEffect(() => {
    if (!serviceOnlyAgreement) return;
    setSelectedServiceEntriesByServiceId((prev) => {
      let changed = false;
      const next: Record<string, string[]> = { ...prev };
      for (const sv of serviceItems) {
        const keys = next[sv.id];
        if (!keys?.length) continue;
        const filtered = keys.filter((k) => {
          const [mm, dd] = String(k).split("-").map(Number);
          if (!Number.isFinite(mm) || !Number.isFinite(dd)) return false;
          return !paidSlotKeys.has(recurrenceSlotKey(sv.id, mm, dd));
        });
        if (filtered.length !== keys.length) {
          changed = true;
          if (filtered.length === 0) delete next[sv.id];
          else next[sv.id] = filtered;
        }
      }
      return changed ? next : prev;
    });
  }, [serviceOnlyAgreement, serviceItems, paidSlotKeys]);

  useEffect(() => {
    if (!open) {
      settledNotifiedAgreementIdRef.current = null;
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setFeePolicyQrDataUrl(null);
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(STRIPE_PRICING_PAGE_URL, { width: 112, margin: 1 }).then((url) => {
      if (!cancelled) setFeePolicyQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (serviceOnlyAgreement) {
      if (!allRecurrencesPaidVerified || busyPay) return;
    } else {
      if (!breakdown?.ok || !breakdown.byCurrency.length) return;
      const settled = breakdown.byCurrency.every((bc) =>
        currencyPaid(statuses, bc.currencyLower),
      );
      if (!settled) return;
    }

    const aid = (selectedAgreement?.id ?? agreementId ?? "").trim();
    if (!aid) return;
    if (settledNotifiedAgreementIdRef.current === aid) return;
    settledNotifiedAgreementIdRef.current = aid;
    onPaymentFullySettled?.();
  }, [
    open,
    breakdown,
    statuses,
    onPaymentFullySettled,
    selectedAgreement?.id,
    agreementId,
    serviceOnlyAgreement,
    allRecurrencesPaidVerified,
    busyPay,
  ]);

  useEffect(() => {
    if (!open || !agreements.length) return;
    if (!agreementId || !agreements.some((x) => x.id === agreementId))
      setAgreementId(agreements[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agreements]);

  useEffect(() => {
    if (!open) return;
    // Al cambiar de acuerdo, resetear selección específica de servicios.
    setSelectedServiceEntriesByServiceId({});
  }, [open, agreementId]);

  useEffect(() => {
    if (!open) return;
    setStatuses([]);
    setServicePaymentsPaid([]);
    setAllRecurrencesPaidVerified(false);
  }, [open, threadId, agreementId]);

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
      /* Acuerdos solo servicios: el desglose depende de las recurrencias elegidas; lo carga el efecto siguiente. */
      if (!serviceOnlyAgreement) {
        await reloadCheckout({ skipBusyToggle: true });
      }
    })().finally(() => setBusyInit(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agreementId, serviceOnlyAgreement]);

  /** Cada cambio de servicios / recurrencias a pagar debe refrescar informe en pantalla y base del PDF. */
  useEffect(() => {
    if (!open || !serviceOnlyAgreement || busyPay) return;
    void reloadCheckout();
  }, [
    open,
    agreementId,
    serviceOnlyAgreement,
    reloadCheckout,
    selectedServicePayments,
    busyPay,
  ]);

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
    if (serviceOnlyAgreement) {
      for (const sel of selectedServicePayments) {
        const slot = recurrenceSlotKey(
          sel.serviceItemId,
          sel.entryKey.month,
          sel.entryKey.day,
        );
        if (paidSlotKeys.has(slot)) {
          toast.error("Esa recurrencia ya está cobrada. Actualizamos el listado.");
          void reloadCheckout();
          return;
        }
      }
    }

    const servicePicksForThisCharge = serviceOnlyAgreement
      ? selectedServicePayments.map((p) => ({
          serviceItemId: p.serviceItemId,
          entryKey: { ...p.entryKey },
        }))
      : [];

    let ik = idemByCurrency.refs[curLower]?.trim();
    if (!ik || ik.length < 8)
      ik = crypto.randomUUID();
    idemByCurrency.refs[curLower] = ik;

    setBusyPay(true);
    if (serviceOnlyAgreement) setAllRecurrencesPaidVerified(false);
    beginChatPaymentExecute(threadId);

    try {
      const cfg = await getStripeConfig();
      const r = await executeAgreementCurrencyPayment({
        threadId,
        agreementId: ag.id,
        currency: curLower,
        paymentMethodId: pmId,
        idempotencyKey: ik,
        selectedServicePayments: serviceOnlyAgreement
          ? selectedServicePayments
          : undefined,
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
      if (!r.accepted && r.errorCode === "recurrence_already_paid") {
        toast.error(
          r.stripeErrorMessage ??
            "Esa recurrencia ya fue cobrada. Actualizamos el listado.",
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
      if (servicePicksForThisCharge.length > 0) {
        flushSync(() => {
          setSelectedServiceEntriesByServiceId((prev) => {
            const next: Record<string, string[]> = { ...prev };
            for (const sel of servicePicksForThisCharge) {
              const slotKey = `${sel.entryKey.month}-${sel.entryKey.day}`;
              const arr = next[sel.serviceItemId];
              if (!arr?.length) continue;
              const filtered = arr.filter((k) => k !== slotKey);
              if (filtered.length === 0) delete next[sel.serviceItemId];
              else next[sel.serviceItemId] = filtered;
            }
            return next;
          });
        });
      }
      delete idemByCurrency.refs[curLower];
      setAcceptedInforme(false);
      await reloadCheckout({ allowVerifiedDuringBusyPay: true });
    } catch (e) {
      toast.error((e as Error)?.message ?? "No se pudo completar el pago.");
    } finally {
      endChatPaymentExecute(threadId);
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
    <div
      className="vt-modal-backdrop"
      role="presentation"
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div
                id="chat-pay-title"
                className="vt-modal-title flex items-center gap-2"
              >
                <CreditCard size={18} aria-hidden /> Pago del acuerdo
              </div>
              <p className="vt-muted mt-1 text-[12px] leading-snug">
                Se cobra solo el subtotal del acuerdo (mercadería, servicios y tramos incluidos). La
                referencia Climate ({paymentFeeLabels.climateRateDisplay}) y la tarifa Stripe estimada (
                {paymentFeeLabels.stripePctDisplay} + fijo) son avisos informativos y no se suman al cargo.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
              <a
                href={STRIPE_PRICING_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-black text-[var(--primary)] underline decoration-1 underline-offset-2"
              >
                Precios / políticas Stripe
              </a>
              {feePolicyQrDataUrl ?
                <img
                  src={feePolicyQrDataUrl}
                  alt="Código QR a precios Stripe"
                  className="size-14 rounded-md border border-[var(--border)] bg-white p-0.5"
                />
              : null}
            </div>
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

              {serviceOnlyAgreement &&
              paidRecurrenceSummaryLines.length > 0 &&
              !allRecurrencesPaidVerified ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
                  <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                    Recurrencias ya cobradas
                  </div>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12px] leading-snug text-[var(--text)]">
                    {paidRecurrenceSummaryLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {serviceOnlyAgreement ? (
                <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
                  <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                    Servicios a pagar
                  </div>
                  <p className="vt-muted mt-1 text-[12px] leading-snug">
                    Este acuerdo contiene solo servicios. Selecciona uno o varios servicios y, para cada uno,
                    elige la recurrencia (entrada) que deseas pagar. Las que ya fueron cobradas no aparecen.
                  </p>
                  {serviceItems.length === 0 ? (
                    <p className="vt-muted mt-2 text-[13px]">
                      No hay servicios configurados en este acuerdo.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {serviceItems.map((sv) => {
                        const allEntries =
                          sv.recurrenciaPagos?.entries?.map((e) => ({
                            value: `${e.month}-${e.day}`,
                            label: `Mes ${e.month} · Día ${e.day} · ${e.amount} ${e.moneda}`,
                            raw: e,
                          })) ?? [];
                        const unpaidEntryOptions = allEntries.filter(
                          (o) =>
                            !paidSlotKeys.has(
                              recurrenceSlotKey(sv.id, o.raw.month, o.raw.day),
                            ),
                        );
                        const hasUnpaid = unpaidEntryOptions.length > 0;
                        const checked =
                          hasUnpaid &&
                          (selectedServiceEntriesByServiceId[sv.id]?.length ?? 0) > 0;
                        const pickedKeys = selectedServiceEntriesByServiceId[sv.id] ?? [];
                        if (!hasUnpaid) {
                          return (
                            <div
                              key={sv.id}
                              className="rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] p-2.5"
                            >
                              <div className="text-[13px] font-bold text-[var(--text)]">
                                {sv.tipoServicio || "Servicio"}
                              </div>
                              <p className="vt-muted mt-1 mb-0 text-[12px] leading-snug">
                                Todas las recurrencias de este servicio ya fueron cobradas.
                              </p>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={sv.id}
                            className="rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] p-2.5"
                          >
                            <label className="flex cursor-pointer items-start gap-2 text-[13px] font-bold text-[var(--text)]">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={checked}
                                onChange={(e) => {
                                  const nextOn = e.target.checked;
                                  setSelectedServiceEntriesByServiceId((prev) => {
                                    if (nextOn) {
                                      const first = unpaidEntryOptions[0]?.raw;
                                      const def =
                                        first ? [`${first.month}-${first.day}`] : [];
                                      return { ...prev, [sv.id]: prev[sv.id]?.length ? prev[sv.id] : def };
                                    }
                                    const { [sv.id]: _drop, ...rest } = prev;
                                    return rest;
                                  });
                                  setAcceptedInforme(false);
                                }}
                              />
                              <span className="min-w-0 break-words">{sv.tipoServicio || "Servicio"}</span>
                            </label>
                            {checked ? (
                              <div className="mt-2">
                                <div className="vt-muted mb-1 text-[11px] font-black uppercase tracking-wide">
                                  Recurrencias a pagar
                                </div>
                                <VtMultiSelect
                                  value={pickedKeys}
                                  onChange={(next) => {
                                    setSelectedServiceEntriesByServiceId((prev) => {
                                      if (next.length === 0) {
                                        const { [sv.id]: _drop, ...rest } = prev;
                                        return rest;
                                      }
                                      return { ...prev, [sv.id]: next };
                                    });
                                    setAcceptedInforme(false);
                                  }}
                                  options={unpaidEntryOptions.map((o) => ({
                                    value: o.value,
                                    label: o.label,
                                  }))}
                                  ariaLabel={`Seleccionar recurrencias para ${sv.tipoServicio || "servicio"}`}
                                  buttonClassName="min-h-10 bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] border-[color-mix(in_oklab,var(--border)_90%,transparent)] shadow-[inset_0_1px_0_rgba(2,6,23,0.55)]"
                                />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ) : null}

              {!selectedServicePaymentsReady &&
              !(serviceOnlyAgreement && allRecurrencesPaidVerified && !busyPay) ? (
                <div className="rounded-2xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-[13px] leading-snug text-[var(--text)]">
                  Selecciona al menos un servicio y una recurrencia para ver el desglose de pago.
                </div>
              ) : serviceOnlyAgreement &&
                allRecurrencesPaidVerified &&
                !busyPay ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-[color-mix(in_oklab,emerald_10%,var(--surface))] p-3 text-[13px] leading-snug text-emerald-900 dark:text-emerald-100">
                  <p className="m-0 font-bold">
                    Cobros listos en todas las monedas necesarias del acuerdo.
                  </p>
                  {paidRecurrenceSummaryLines.length > 0 ? (
                    <ul className="mt-2 mb-0 list-disc space-y-0.5 pl-5 text-[12px] opacity-95">
                      {paidRecurrenceSummaryLines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : busyInit ? (
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
              ) : breakdown && !breakdown.ok ? (
                <div className="rounded-2xl border border-[color-mix(in_oklab,var(--bad)_42%,var(--border))] bg-[color-mix(in_oklab,var(--bad)_10%,var(--surface))] p-3 text-[13px] leading-snug">
                  {breakdown.errors.map((e) => (
                    <div key={e}>• {e}</div>
                  ))}
                </div>
              ) : breakdown && breakdown.ok && breakdown.byCurrency.length === 0 ? (
                <div className="vt-muted text-[13px]">Sin montos a cobrar en este momento.</div>
              ) : breakdown && breakdown.ok && breakdown.byCurrency.length > 0 ? (
                <>
                  <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
                    <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                      Informe
                    </div>
                    <div className="mt-2 space-y-3">
                      {breakdown.byCurrency.map((bc) => {
                        const c = bc.currencyLower;
                        const paid = informeCurrencyPaidDisplay(c);
                        const refCombo = bc.climateMinor + bc.stripeFeeMinor;
                        return (
                          <div
                            key={c}
                            className="space-y-2 rounded-xl border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] px-3 py-2"
                          >
                            <div
                              className="rounded-lg border border-[color-mix(in_oklab,#f59e0b_45%,var(--border))] bg-[color-mix(in_oklab,#f59e0b_10%,var(--surface))] px-2.5 py-1.5 text-[11px] leading-snug text-[var(--text)]"
                              role="note"
                            >
                              <span className="font-black">Aviso:</span> Climate + Stripe estimado (~
                              {fmt(refCombo, c)}) es solo referencia; no se suma al cobro con tarjeta (
                              {fmt(bc.totalMinor, c)}).
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-[13px] font-black">
                                Moneda {c.toUpperCase()}{paid ?
                                  <span className="vt-muted ml-2 text-[11px] font-bold">
                                    — cobro OK
                                  </span>
                                : null}
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-[13px] font-bold">
                                  {fmt(bc.totalMinor, c)}
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                                  A cobrar (subtotal)
                                </div>
                              </div>
                            </div>
                            <div className="vt-muted mt-1 grid gap-0.5 text-[12px]">
                              <div>
                                Referencia Climate ({paymentFeeLabels.climateRateDisplay}):{" "}
                                {fmt(bc.climateMinor, c)} · Tarifa Stripe est. ({paymentFeeLabels.stripePctDisplay}
                                ): {fmt(bc.stripeFeeMinor, c)} · Combinado ref.: {fmt(refCombo, c)}
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
                      Confirmé el desglose: el cobro es el subtotal del acuerdo; las líneas Climate y Stripe
                      son referencias informativas. Revisé conceptos incluidos y adjuntos del vendedor antes de
                      pagar con Stripe.
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
              ) : !busyInit && !breakdown ? (
                <p className="vt-muted text-[13px] leading-snug">
                  No pudimos obtener el informe desde el servidor. Revisa la conexión o volvé a intentar más
                  tarde.
                </p>
              ) : null}

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
          {allPaid &&
          !(serviceOnlyAgreement && allRecurrencesPaidVerified && !busyPay) ?
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
                  !curOk ||
                  !selectedServicePaymentsReady;
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
    </div>,
    document.body,
  );
}
