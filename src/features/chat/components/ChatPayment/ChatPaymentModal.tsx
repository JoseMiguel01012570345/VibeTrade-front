import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import { CreditCard, FileDown, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { cn } from "@shared/lib/cn";
import { useNavigate } from "react-router-dom";
import {
  executeAgreementCurrencyPayment,
  fetchAgreementCheckoutBreakdown,
  fetchAgreementPaymentStatuses,
  fetchAgreementRoutePaths,
  type AgreementCheckoutBreakdownApi,
  type AgreementPaymentStatusApi,
  type AgreementRoutePathApi,
} from "@/utils/chat/agreementCheckoutApi";
import {
  fetchAgreementRouteDeliveries,
  type RouteStopDeliveryStatusApi,
} from "@/utils/chat/routeLogisticsApi";
import {
  listAgreementServicePayments,
  type AgreementServicePaymentApi,
} from "@/utils/chat/agreementServiceEvidenceApi";
import {
  getStripeConfig,
  listStripeCards,
  type StripeSavedCard,
} from "@features/payments/api/stripeApi";
import {
  beginChatPaymentExecute,
  endChatPaymentExecute,
} from "@/utils/chat/chatRealtime";
import { useAppStore } from "@app/store/useAppStore";
import type { TradeAgreement } from "@features/market/model/tradeAgreementTypes";
import {
  agreementDeclaresMerchandise,
  agreementDeclaresService,
  normalizeAgreementServices,
  normalizeMerchandiseLine,
} from "@features/market/model/tradeAgreementTypes";
import { paymentFeeLabels, minorToMajor } from "@features/market/model/paymentFeePolicy";
import type { ChatPaymentModalProps } from "./types";
import {
  currencyPaid,
  deliveryMarksStopPaid,
  fmtPaymentAmount as fmt,
  parseMajorAmount,
  recurrenceSlotKey,
  shouldWarnUnconfirmedRouteCarriers,
} from "./chatPaymentUtils";
import { RoutePaymentCarrierWarningModal } from "./RoutePaymentCarrierWarningModal";
import {
  downloadPaymentCheckoutInformePdf,
  sanitizePaymentInformeLabel,
} from "@features/chat/utils/paymentCheckoutPdfDownload";
import { collectAgreementInformePreviewEntries } from "@features/chat/utils/tradeAgreementPdfText";
import { STRIPE_PRICING_PAGE_URL } from "@features/market/model/stripePricingLinks";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { VtSelect, type VtSelectOption } from "@shared/components/ui/VtSelect";
import { VtMultiSelect } from "@shared/components/ui/VtMultiSelect";

type Props = ChatPaymentModalProps;

function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
  routeSheets = [],
  onClose,
  onPaymentFullySettled,
}: Props) {
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);

  const [busyInit, setBusyInit] = useState(false);
  const [busyPay, setBusyPay] = useState(false);
  const busyPayRef = useRef(false);
  busyPayRef.current = busyPay;
  /** Evita doble envío antes de que React aplique `busyPay`. */
  const payFlightRef = useRef(false);

  const [agreementId, setAgreementId] = useState<string>("");
  const [breakdown, setBreakdown] =
    useState<AgreementCheckoutBreakdownApi | null>(null);
  const [statuses, setStatuses] = useState<AgreementPaymentStatusApi[]>([]);
  const [servicePaymentsPaid, setServicePaymentsPaid] = useState<
    AgreementServicePaymentApi[]
  >([]);
  /** Solo true tras un refresh OK desde el servidor (lista service-payments); no usar antes de esa respuesta. */
  const [allRecurrencesPaidVerified, setAllRecurrencesPaidVerified] =
    useState(false);
  const [cards, setCards] = useState<StripeSavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");

  /** Reintentos mismos montos mismo intento cliente. */
  const [idemByCurrency] = useState(() => ({
    refs: {} as Record<string, string>,
  }));

  const [acceptedInforme, setAcceptedInforme] = useState(false);
  const [feePolicyQrDataUrl, setFeePolicyQrDataUrl] = useState<string | null>(
    null,
  );
  const settledNotifiedAgreementIdRef = useRef<string | null>(null);

  const agreementsRef = useRef(agreements);
  const routeSheetsRef = useRef(routeSheets);
  agreementsRef.current = agreements;
  routeSheetsRef.current = routeSheets;

  const selectedAgreement = useMemo(
    () => agreements.find((a) => a.id === agreementId) ?? agreements[0] ?? null,
    [agreementId, agreements],
  );

  const agreementRouteSheet = useMemo(() => {
    const rsid = (selectedAgreement?.routeSheetId ?? "").trim();
    if (rsid.length < 2) return null;
    return routeSheets.find((r) => r.id === rsid) ?? null;
  }, [routeSheets, selectedAgreement?.routeSheetId]);

  const [routeDeliveries, setRouteDeliveries] = useState<
    RouteStopDeliveryStatusApi[]
  >([]);
  const [agreementRoutePaths, setAgreementRoutePaths] = useState<
    AgreementRoutePathApi[]
  >([]);
  const [includeTransportInCharge, setIncludeTransportInCharge] = useState(true);
  const [selectedMerchandiseLineIds, setSelectedMerchandiseLineIds] = useState<
    string[]
  >([]);
  const [checkoutHydrated, setCheckoutHydrated] = useState(false);
  const [carrierWarningOpen, setCarrierWarningOpen] = useState(false);
  const [carrierWarningSheetTitle, setCarrierWarningSheetTitle] = useState("");
  const lastCarrierWarningKeyRef = useRef<string | null>(null);

  const serviceOnlyAgreement = useMemo(() => {
    if (!selectedAgreement) return false;
    return (
      agreementDeclaresService(selectedAgreement) &&
      !agreementDeclaresMerchandise(selectedAgreement)
    );
  }, [selectedAgreement]);

  const payableRoutePaths = useMemo(
    () =>
      agreementRoutePaths.filter(
        (p) => p.payable && !p.paid && !p.partiallyPaid,
      ),
    [agreementRoutePaths],
  );

  const routePathsAwaitingCarriers = useMemo(
    () =>
      agreementRoutePaths.filter(
        (p) =>
          !p.paid &&
          !p.partiallyPaid &&
          !p.payable &&
          (p.totalsByCurrency?.length ?? 0) > 0,
      ),
    [agreementRoutePaths],
  );

  const routePickAgreement = useMemo(() => {
    if (!selectedAgreement) return false;
    if (serviceOnlyAgreement) return false;
    return (
      agreementDeclaresMerchandise(selectedAgreement) &&
      !!(selectedAgreement.routeSheetId ?? "").trim() &&
      (payableRoutePaths.length > 0 || agreementRoutePaths.length > 0)
    );
  }, [
    selectedAgreement,
    serviceOnlyAgreement,
    payableRoutePaths.length,
    agreementRoutePaths.length,
  ]);

  /** Evita recrear el Set en cada fetch si la respuesta es equivalente (rompe bucles efecto → setState → reload). */
  const routeDeliveriesPaidKey = useMemo(
    () =>
      routeDeliveries
        .map((d) => `${(d.routeStopId ?? "").trim()}:${(d.state ?? "").trim()}`)
        .sort()
        .join("|"),
    [routeDeliveries],
  );

  const paidRouteStopIds = useMemo(() => {
    const s = new Set<string>();
    for (const d of routeDeliveries) {
      if (!deliveryMarksStopPaid(d)) continue;
      const sid = (d.routeStopId ?? "").trim();
      if (sid) s.add(sid);
    }
    return s;
    // routeDeliveriesPaidKey resume el contenido relevante; routeDeliveries solo debe leerse cuando la huella cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional fingerprint gate
  }, [routeDeliveriesPaidKey]);

  const payableRoutePathIdsKey = useMemo(
    () =>
      payableRoutePaths
        .map((p) => p.routePathId.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .join("|"),
    [payableRoutePaths],
  );

  const payableRoutePath = payableRoutePaths[0] ?? null;

  const routeLegSelectionRequired =
    routePickAgreement && payableRoutePaths.length > 0;

  const payableMerchLines = useMemo(() => {
    if (!selectedAgreement || !agreementDeclaresMerchandise(selectedAgreement))
      return [];
    const out: { id: string; title: string; subtitle: string }[] = [];
    selectedAgreement.merchandise.forEach((raw, i) => {
      const line = normalizeMerchandiseLine(raw);
      const id = (line.id ?? "").trim();
      if (!id) return;
      const q = parseMajorAmount(line.cantidad);
      const vu = parseMajorAmount(line.valorUnitario);
      if (q <= 0 || vu <= 0) return;
      const title = (line.tipo ?? "").trim() || `Mercancía ${i + 1}`;
      const mon = (line.moneda ?? "").trim();
      out.push({
        id,
        title,
        subtitle: `${line.cantidad} × ${line.valorUnitario}${mon ? ` ${mon}` : ""}`,
      });
    });
    return out;
  }, [selectedAgreement]);

  const merchCheckboxSectionVisible =
    !serviceOnlyAgreement && payableMerchLines.length > 0;

  const payableMerchIdsKey = useMemo(
    () =>
      payableMerchLines
        .map((m) => m.id)
        .sort()
        .join("|"),
    [payableMerchLines],
  );

  const [
    selectedServiceEntriesByServiceId,
    setSelectedServiceEntriesByServiceId,
  ] = useState<Record<string, string[]>>({});

  const serviceItems = useMemo(
    () =>
      selectedAgreement ? normalizeAgreementServices(selectedAgreement) : [],
    [selectedAgreement],
  );

  const selectedServicePayments = useMemo(() => {
    const ids = new Set(serviceItems.map((s) => s.id));
    const out: Array<{
      serviceItemId: string;
      entryKey: { month: number; day: number };
    }> = [];
    for (const [sid, keys] of Object.entries(
      selectedServiceEntriesByServiceId,
    )) {
      if (!ids.has(sid)) continue;
      for (const k of keys) {
        const [mm, dd] = String(k)
          .split("-")
          .map((x) => Number(x));
        if (!Number.isFinite(mm) || !Number.isFinite(dd)) continue;
        out.push({ serviceItemId: sid, entryKey: { month: mm, day: dd } });
      }
    }
    return out;
  }, [selectedServiceEntriesByServiceId, serviceItems]);

  const servicePaymentsSelectionKey = useMemo(
    () =>
      selectedServicePayments
        .map((p) => `${p.serviceItemId}:${p.entryKey.month}-${p.entryKey.day}`)
        .sort()
        .join("|"),
    [selectedServicePayments],
  );

  const transportSelectionKey = includeTransportInCharge ? "1" : "0";

  const merchSelectionKey = useMemo(
    () => [...selectedMerchandiseLineIds].sort().join("|"),
    [selectedMerchandiseLineIds],
  );

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
  const includeTransportInChargeRef = useRef(includeTransportInCharge);
  const agreementRoutePathsRef = useRef(agreementRoutePaths);
  const selectedMerchandiseLineIdsRef = useRef(selectedMerchandiseLineIds);
  const routeDeliveriesRef = useRef(routeDeliveries);
  const servicePaymentsPaidRef = useRef(servicePaymentsPaid);
  const fetchCheckoutBreakdownOnlyRef = useRef<() => Promise<void>>(
    async () => {},
  );
  const transportSelectionTouchedRef = useRef(false);
  selectedServicePaymentsRef.current = selectedServicePayments;
  servicePaymentsPaidRef.current = servicePaymentsPaid;
  selectedServicePaymentsReadyRef.current = selectedServicePaymentsReady;
  includeTransportInChargeRef.current = includeTransportInCharge;
  agreementRoutePathsRef.current = agreementRoutePaths;
  selectedMerchandiseLineIdsRef.current = selectedMerchandiseLineIds;
  routeDeliveriesRef.current = routeDeliveries;

  const hybridServiceBlocks =
    !serviceOnlyAgreement &&
    !!selectedAgreement &&
    agreementDeclaresService(selectedAgreement) &&
    serviceItems.length > 0;

  const nonServiceBreakdownSelectionsReady = useMemo(() => {
    if (serviceOnlyAgreement) return true;
    let anyBucket = false;
    let anySelected = false;
    if (routeLegSelectionRequired) {
      anyBucket = true;
      if (includeTransportInCharge) anySelected = true;
    }
    if (merchCheckboxSectionVisible) {
      anyBucket = true;
      if (selectedMerchandiseLineIds.length > 0) anySelected = true;
    }
    if (hybridServiceBlocks) {
      anyBucket = true;
      if (selectedServicePayments.length > 0) anySelected = true;
    }
    return !anyBucket || anySelected;
  }, [
    serviceOnlyAgreement,
    routeLegSelectionRequired,
    includeTransportInCharge,
    merchCheckboxSectionVisible,
    selectedMerchandiseLineIds,
    hybridServiceBlocks,
    selectedServicePayments.length,
  ]);

  /** Cobertura de selección previa al desglose / cobro (servicios y/o tramos). */
  const checkoutSelectionsReady = serviceOnlyAgreement
    ? selectedServicePaymentsReady
    : nonServiceBreakdownSelectionsReady;

  const previews = useMemo(
    () =>
      selectedAgreement
        ? collectAgreementInformePreviewEntries(selectedAgreement)
        : [],
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

  function breakdownHasUnpaidMerchandiseForCurrency(curLower: string): boolean {
    const c = curLower.trim().toLowerCase();
    const bc = breakdown?.byCurrency ?? [];
    const bucket = bc.find((x) => x.currencyLower.trim().toLowerCase() === c);
    if (!bucket) return false;
    return bucket.lines.some(
      (ln) =>
        String(ln.category ?? "").toLowerCase() === "merchandise" &&
        ln.amountMinor > 0,
    );
  }

  function breakdownHasUnpaidRouteLegsForCurrency(curLower: string): boolean {
    const c = curLower.trim().toLowerCase();
    const bc = breakdown?.byCurrency ?? [];
    const bucket = bc.find((x) => x.currencyLower.trim().toLowerCase() === c);
    if (!bucket) return false;
    for (const ln of bucket.lines) {
      if (String(ln.category ?? "").toLowerCase() !== "route_leg") continue;
      if (ln.amountMinor <= 0) continue;
      const sid = (ln.routeStopId ?? "").trim();
      if (!sid) return true;
      if (!paidRouteStopIds.has(sid)) return true;
    }
    return false;
  }

  const pendingCurrencies = useMemo(() => {
    if (!serviceOnlyAgreement) {
      const bc = breakdown?.byCurrency ?? [];
      const out: string[] = [];
      for (const b of bc) {
        const c = b.currencyLower.trim().toLowerCase();
        const paidAny = currencyPaid(statuses, c);
        if (!paidAny) {
          out.push(c);
          continue;
        }
        // Pagos parciales por tramo pueden dejar mercadería u otros ítems pendientes en la misma moneda.
        if (breakdownHasUnpaidMerchandiseForCurrency(c)) out.push(c);
        else if (breakdownHasUnpaidRouteLegsForCurrency(c)) out.push(c);
      }
      return out;
    }
    const curSet = new Set<string>();
    for (const sv of serviceItems) {
      for (const e of sv.recurrenciaPagos?.entries ?? []) {
        const mon = (e.moneda ?? "").trim().toLowerCase();
        if (mon.length < 3) continue;
        if (!paidSlotKeys.has(recurrenceSlotKey(sv.id, e.month, e.day)))
          curSet.add(mon);
      }
    }
    return [...curSet];
  }, [
    serviceOnlyAgreement,
    breakdown?.byCurrency,
    breakdown,
    statuses,
    serviceItems,
    paidSlotKeys,
    paidRouteStopIds,
  ]);

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
    if (!serviceOnlyAgreement) {
      if (!currencyPaid(statuses, c)) return false;
      if (breakdownHasUnpaidMerchandiseForCurrency(c)) return false;
      if (breakdownHasUnpaidRouteLegsForCurrency(c)) return false;
      return true;
    }
    for (const sv of serviceItems) {
      for (const e of sv.recurrenciaPagos?.entries ?? []) {
        if ((e.moneda ?? "").trim().toLowerCase() !== c) continue;
        if (!paidSlotKeys.has(recurrenceSlotKey(sv.id, e.month, e.day)))
          return false;
      }
    }
    return true;
  }

  const hydratePaymentContext = useCallback(
    async (opts?: {
      skipBusyToggle?: boolean;
      allowVerifiedDuringBusyPay?: boolean;
    }) => {
      const list = agreementsRef.current;
      const aid = (agreementId ?? "").trim();
      const ag =
        (aid ? list.find((a) => a.id === aid) : null) ?? list[0] ?? null;
      if (!ag) {
        setStatuses([]);
        setServicePaymentsPaid([]);
        servicePaymentsPaidRef.current = [];
        setAllRecurrencesPaidVerified(false);
        routeDeliveriesRef.current = [];
        setRouteDeliveries([]);
        setCheckoutHydrated(false);
        return;
      }
      const skipBusy = opts?.skipBusyToggle === true;
      if (!skipBusy) setBusyInit(true);
      setCheckoutHydrated(false);
      try {
        const [ps, sp] = await Promise.all([
          fetchAgreementPaymentStatuses(threadId, ag.id),
          listAgreementServicePayments(threadId, ag.id).catch(
            () => [] as AgreementServicePaymentApi[],
          ),
        ]);
        setStatuses(ps);
        setServicePaymentsPaid(sp);
        servicePaymentsPaidRef.current = sp;

        const pk = new Set(
          sp.map((p) =>
            recurrenceSlotKey(p.serviceItemId, p.entryMonth, p.entryDay),
          ),
        );
        const svcOnly =
          agreementDeclaresService(ag) && !agreementDeclaresMerchandise(ag);
        const fullyPaid = svcOnly && computeAllSlotsPaid(ag, pk);
        const mayCommitVerified =
          !busyPayRef.current || opts?.allowVerifiedDuringBusyPay === true;
        setAllRecurrencesPaidVerified(mayCommitVerified && fullyPaid);

        const rsid = (ag.routeSheetId ?? "").trim();
        const pickRouteLegs =
          !svcOnly && agreementDeclaresMerchandise(ag) && rsid.length > 1;

        let deliveries: RouteStopDeliveryStatusApi[] = [];
        let paths: AgreementRoutePathApi[] = [];
        if (pickRouteLegs) {
          try {
            deliveries = await fetchAgreementRouteDeliveries(threadId, ag.id);
          } catch {
            deliveries = [];
          }
          try {
            const rp = await fetchAgreementRoutePaths(threadId, ag.id, rsid);
            paths = rp.paths ?? [];
          } catch {
            paths = [];
          }
        }
        routeDeliveriesRef.current = deliveries;
        setRouteDeliveries(deliveries);
        setAgreementRoutePaths(paths);
        setCheckoutHydrated(true);
      } catch (e) {
        const msg =
          (e as Error)?.message?.trim() ||
          "No se pudo cargar el estado de pagos.";
        setStatuses([]);
        setServicePaymentsPaid([]);
        servicePaymentsPaidRef.current = [];
        setAllRecurrencesPaidVerified(false);
        routeDeliveriesRef.current = [];
        setRouteDeliveries([]);
        setAgreementRoutePaths([]);
        setCheckoutHydrated(false);
        toast.error(msg);
      } finally {
        if (!skipBusy) setBusyInit(false);
      }
    },
    [threadId, agreementId],
  );

  const fetchCheckoutBreakdownOnly = useCallback(async () => {
    const list = agreementsRef.current;
    const aid = (agreementId ?? "").trim();
    const ag = (aid ? list.find((a) => a.id === aid) : null) ?? list[0] ?? null;
    if (!ag) {
      setBreakdown(null);
      return;
    }
    const svcOnly =
      agreementDeclaresService(ag) && !agreementDeclaresMerchandise(ag);
    if (svcOnly) {
      const pk = new Set(
        servicePaymentsPaidRef.current.map((p) =>
          recurrenceSlotKey(p.serviceItemId, p.entryMonth, p.entryDay),
        ),
      );
      const fullyPaid = computeAllSlotsPaid(ag, pk);
      if (fullyPaid && !busyPayRef.current) {
        setBreakdown(null);
        return;
      }
      if (!selectedServicePaymentsReadyRef.current) {
        setBreakdown(null);
        return;
      }
    }

    try {
      const rsid = (ag.routeSheetId ?? "").trim();
      const paths = agreementRoutePathsRef.current;
      const payablePaths = paths.filter(
        (p) => p.payable && !p.paid && !p.partiallyPaid,
      );
      const routeLegReqLocal =
        !svcOnly &&
        agreementDeclaresMerchandise(ag) &&
        rsid.length > 1 &&
        payablePaths.length > 0;

      const payableMerchIds = new Set<string>();
      for (const raw of ag.merchandise ?? []) {
        const line = normalizeMerchandiseLine(raw);
        const mid = (line.id ?? "").trim();
        if (!mid) continue;
        const q = parseMajorAmount(line.cantidad);
        const vu = parseMajorAmount(line.valorUnitario);
        if (q <= 0 || vu <= 0) continue;
        payableMerchIds.add(mid);
      }
      const includeMerch = payableMerchIds.size > 0;

      const pathsPick = routeLegReqLocal
        ? includeTransportInChargeRef.current
          ? null
          : []
        : [];

      const merchPick = includeMerch
        ? selectedMerchandiseLineIdsRef.current.filter((id) =>
            payableMerchIds.has(id.trim()),
          )
        : [];

      let routeArg: string[] | null | undefined = undefined;
      let merchArg: string[] | null | undefined = undefined;

      if (!svcOnly) {
        if (includeMerch) merchArg = merchPick;
        if (routeLegReqLocal) routeArg = pathsPick;
        else if (includeMerch && paths.length > 0) routeArg = [];
      }

      const bd = await fetchAgreementCheckoutBreakdown(threadId, ag.id, {
        selectedServicePayments: svcOnly
          ? selectedServicePaymentsRef.current
          : selectedServicePaymentsRef.current.length > 0
            ? selectedServicePaymentsRef.current
            : undefined,
        selectedRoutePathIds: routeArg,
        selectedMerchandiseLineIds: merchArg,
      });
      setBreakdown(bd);
    } catch (e) {
      const msg =
        (e as Error)?.message?.trim() ||
        "No se pudo cargar el informe de pago.";
      setBreakdown({ ok: false, errors: [msg], byCurrency: [] });
      toast.error(msg);
    }
  }, [threadId, agreementId]);

  fetchCheckoutBreakdownOnlyRef.current = fetchCheckoutBreakdownOnly;

  const reloadCheckout = useCallback(
    async (opts?: {
      skipBusyToggle?: boolean;
      allowVerifiedDuringBusyPay?: boolean;
    }) => {
      setBreakdown(null);
      await hydratePaymentContext(opts);
      await fetchCheckoutBreakdownOnly();
    },
    [hydratePaymentContext, fetchCheckoutBreakdownOnly],
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
    void QRCode.toDataURL(STRIPE_PRICING_PAGE_URL, {
      width: 112,
      margin: 1,
    }).then((url) => {
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
      if (pendingCurrencies.length > 0) return;
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
    pendingCurrencies.length,
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
    if (!open) {
      setCarrierWarningOpen(false);
      lastCarrierWarningKeyRef.current = null;
      return;
    }
    lastCarrierWarningKeyRef.current = null;
  }, [open, agreementId]);

  useEffect(() => {
    if (!open || !checkoutHydrated || busyInit) return;
    if (
      !shouldWarnUnconfirmedRouteCarriers(
        selectedAgreement,
        agreementRoutePaths,
        serviceOnlyAgreement,
        agreementRouteSheet,
      )
    ) {
      return;
    }
    const key = `${selectedAgreement?.id ?? ""}:${agreementRoutePaths
      .map((p) => `${p.routePathId}:${p.payable}:${p.paid}`)
      .join("|")}`;
    if (lastCarrierWarningKeyRef.current === key) return;
    lastCarrierWarningKeyRef.current = key;
    setCarrierWarningSheetTitle(agreementRouteSheet?.titulo?.trim() ?? "");
    setCarrierWarningOpen(true);
  }, [
    open,
    checkoutHydrated,
    busyInit,
    selectedAgreement,
    agreementRoutePaths,
    serviceOnlyAgreement,
    agreementRouteSheet?.titulo,
    agreementRouteSheet?.estado,
  ]);

  useEffect(() => {
    if (!open) return;
    setStatuses([]);
    setServicePaymentsPaid([]);
    setAllRecurrencesPaidVerified(false);
    routeDeliveriesRef.current = [];
    setRouteDeliveries([]);
    transportSelectionTouchedRef.current = false;
    setIncludeTransportInCharge(true);
    setAgreementRoutePaths([]);
    setSelectedMerchandiseLineIds([]);
    setCheckoutHydrated(false);
  }, [open, threadId, agreementId]);

  useEffect(() => {
    if (!open) return;
    if (serviceOnlyAgreement) return;
    if (!routeLegSelectionRequired) {
      setIncludeTransportInCharge((prev) => (prev ? prev : false));
      return;
    }
    if (!transportSelectionTouchedRef.current) {
      setIncludeTransportInCharge(true);
    }
  }, [
    open,
    serviceOnlyAgreement,
    routeLegSelectionRequired,
    payableRoutePathIdsKey,
  ]);

  useEffect(() => {
    if (!open || serviceOnlyAgreement) return;
    if (!merchCheckboxSectionVisible) {
      setSelectedMerchandiseLineIds((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    setSelectedMerchandiseLineIds((prev) => {
      const allowed = new Set(payableMerchLines.map((p) => p.id));
      const filteredPrev = prev.filter((id) => allowed.has(id.trim()));
      const next =
        filteredPrev.length > 0
          ? filteredPrev
          : payableMerchLines.map((p) => p.id);
      return sameStringArray(prev, next) ? prev : next;
    });
  }, [
    open,
    serviceOnlyAgreement,
    merchCheckboxSectionVisible,
    payableMerchIdsKey,
  ]);

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
      await hydratePaymentContext({ skipBusyToggle: true });
    })().finally(() => setBusyInit(false));
  }, [open, agreementId, hydratePaymentContext]);

  /** Desglose (solo POST checkout-breakdown): al cambiar selección de ítems / tramos / cuotas. */
  useEffect(() => {
    if (!open || busyPay || !checkoutHydrated) return;
    if (serviceOnlyAgreement && allRecurrencesPaidVerified && !busyPay) {
      setBreakdown(null);
      return;
    }
    if (!checkoutSelectionsReady) {
      setBreakdown(null);
      return;
    }
    void fetchCheckoutBreakdownOnlyRef.current();
  }, [
    open,
    busyPay,
    checkoutHydrated,
    checkoutSelectionsReady,
    serviceOnlyAgreement,
    allRecurrencesPaidVerified,
    servicePaymentsSelectionKey,
    transportSelectionKey,
    merchSelectionKey,
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
          toast.error(
            "Esa recurrencia ya está cobrada. Actualizamos el listado.",
          );
          void reloadCheckout();
          return;
        }
      }
    }

    const svcOnlyExec =
      agreementDeclaresService(ag) && !agreementDeclaresMerchandise(ag);

    const rsidExec = (ag.routeSheetId ?? "").trim();
    const payablePathsExec = agreementRoutePaths.filter(
      (p) => p.payable && !p.paid && !p.partiallyPaid,
    );
    const routeLegReqExec =
      agreementDeclaresMerchandise(ag) &&
      rsidExec.length > 1 &&
      payablePathsExec.length > 0;

    const payableMerchIdsExec = new Set<string>();
    for (const raw of ag.merchandise ?? []) {
      const line = normalizeMerchandiseLine(raw);
      const mid = (line.id ?? "").trim();
      if (!mid) continue;
      const q = parseMajorAmount(line.cantidad);
      const vu = parseMajorAmount(line.valorUnitario);
      if (q <= 0 || vu <= 0) continue;
      payableMerchIdsExec.add(mid);
    }

    const pathsPickExec = routeLegReqExec
      ? includeTransportInCharge
        ? null
        : []
      : [];

    const merchPickExec =
      payableMerchIdsExec.size > 0
        ? selectedMerchandiseLineIds.filter((id) =>
            payableMerchIdsExec.has(id.trim()),
          )
        : [];

    let routeExecuteArg: string[] | null | undefined = undefined;
    let merchExecuteArg: string[] | null | undefined = undefined;
    if (!svcOnlyExec) {
      if (payableMerchIdsExec.size > 0) merchExecuteArg = merchPickExec;
      if (routeLegReqExec) routeExecuteArg = pathsPickExec;
      else if (payableMerchIdsExec.size > 0 && agreementRoutePaths.length > 0)
        routeExecuteArg = [];
    }

    const servicePicksForThisCharge = svcOnlyExec
      ? selectedServicePayments.map((p) => ({
          serviceItemId: p.serviceItemId,
          entryKey: { ...p.entryKey },
        }))
      : selectedServicePayments.length > 0
        ? selectedServicePayments.map((p) => ({
            serviceItemId: p.serviceItemId,
            entryKey: { ...p.entryKey },
          }))
        : [];

    let ik = idemByCurrency.refs[curLower]?.trim();
    if (!ik || ik.length < 8) ik = crypto.randomUUID();
    idemByCurrency.refs[curLower] = ik;

    if (payFlightRef.current) return;
    payFlightRef.current = true;

    setBusyPay(true);
    if (svcOnlyExec) setAllRecurrencesPaidVerified(false);
    beginChatPaymentExecute(threadId);

    try {
      const cfg = await getStripeConfig();
      const r = await executeAgreementCurrencyPayment({
        threadId,
        agreementId: ag.id,
        currency: curLower,
        paymentMethodId: pmId,
        idempotencyKey: ik,
        selectedServicePayments: svcOnlyExec
          ? selectedServicePayments
          : servicePicksForThisCharge.length > 0
            ? servicePicksForThisCharge
            : undefined,
        selectedRoutePathIds: routeExecuteArg,
        selectedMerchandiseLineIds: merchExecuteArg,
      });

      if (!r.accepted && r.errorCode === "stripe_no_customer") {
        toast.error(
          r.stripeErrorMessage ??
            "Debés tener un cliente Stripe (tarjetas en perfil).",
        );
        return;
      }
      if (!r.accepted && r.errorCode === "checkout_invalid") {
        toast.error(r.stripeErrorMessage ?? "Los montos ya no aplican.");
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
      if (!r.accepted && r.errorCode === "route_path_already_paid") {
        toast.error(
          r.stripeErrorMessage ??
            "Esa ruta ya fue cobrada en esa moneda. Actualizamos el listado.",
        );
        await reloadCheckout();
        return;
      }
      if (!r.accepted && r.errorCode === "merchandise_line_already_paid") {
        toast.error(
          r.stripeErrorMessage ??
            "Esa mercadería ya fue cobrada en esa moneda. Actualizamos el listado.",
        );
        await reloadCheckout();
        return;
      }
      if (!r.accepted && r.errorCode === "already_paid") {
        toast.error(
          r.stripeErrorMessage ??
            "Ya hay un cobro registrado para esa moneda en este acuerdo.",
        );
        await reloadCheckout();
        return;
      }
      if (!r.accepted && r.errorCode === "agreement_currency_mismatch") {
        toast.error(
          r.stripeErrorMessage ??
            "Este acuerdo ya tiene un cobro en otra moneda; no se puede cobrar en otra.",
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
      payFlightRef.current = false;
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
          "vt-modal relative flex max-h-[min(88vh,780px)] w-full max-w-[560px] flex-col overflow-hidden p-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-pay-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <RoutePaymentCarrierWarningModal
          open={carrierWarningOpen}
          routeSheetTitle={carrierWarningSheetTitle}
          onAcknowledge={() => setCarrierWarningOpen(false)}
        />
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
                Elegí acuerdo con el selector. En acuerdos con mercancía y/o
                hoja de ruta marcá qué líneas de mercadería incluís y si sumás
                la hoja de ruta (todos los tramos pendientes); el desglose se
                actualiza al cambiar la selección. En acuerdos solo servicios,
                elegí las cuotas a pagar. La referencia Climate (
                {paymentFeeLabels.climateRateDisplay}) y la tarifa Stripe
                estimada ({paymentFeeLabels.stripePctDisplay} + fijo) son
                informativas y no se suman al cargo.
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
              {feePolicyQrDataUrl ? (
                <img
                  src={feePolicyQrDataUrl}
                  alt="Código QR a precios Stripe"
                  className="size-14 rounded-md border border-[var(--border)] bg-white p-0.5"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {!hasAgreement ? (
            <p className="text-[13px] text-[var(--text)] leading-snug">
              No hay un acuerdo aceptado en este chat. El vendedor debe emitir
              uno y vos aceptarlo antes de pagar aquí.
            </p>
          ) : (
            <>
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

              {merchCheckboxSectionVisible ? (
                <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
                  <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                    Mercancía a incluir en este cobro
                  </div>
                  <p className="vt-muted mt-1 text-[12px] leading-snug">
                    Marcá cada ítem de mercadería que quieras sumar al informe y
                    al cobro. Desmarcar actualiza el desglose al instante.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="vt-btn vt-btn-ghost px-3 py-1 text-[12px]"
                      onClick={() =>
                        setSelectedMerchandiseLineIds(
                          payableMerchLines.map((m) => m.id),
                        )
                      }
                    >
                      Seleccionar todo
                    </button>
                    <button
                      type="button"
                      className="vt-btn vt-btn-ghost px-3 py-1 text-[12px]"
                      onClick={() => setSelectedMerchandiseLineIds([])}
                    >
                      Limpiar
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {payableMerchLines.map((m) => {
                      const checked = selectedMerchandiseLineIds.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex cursor-pointer items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] p-2.5 text-[13px] text-[var(--text)]"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={checked}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setSelectedMerchandiseLineIds((prev) => {
                                const set = new Set(prev);
                                if (on) set.add(m.id);
                                else set.delete(m.id);
                                return [...set];
                              });
                              setAcceptedInforme(false);
                            }}
                          />
                          <span className="min-w-0">
                            <span className="font-bold">{m.title}</span>
                            <span className="vt-muted mt-0.5 block text-[12px]">
                              {m.subtitle}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ) : !serviceOnlyAgreement &&
                selectedAgreement &&
                agreementDeclaresMerchandise(selectedAgreement) &&
                selectedAgreement.merchandise.length > 0 ? (
                <div className="rounded-2xl border border-amber-500/35 bg-[color-mix(in_oklab,amber_8%,var(--surface))] p-3 text-[12px] leading-snug text-[var(--text)]">
                  Hay mercancía en el acuerdo pero las líneas no tienen
                  identificador persistido; no se puede desglosar por ítem hasta
                  que el vendedor vuelva a emitir o actualice el acuerdo en el
                  sistema.
                </div>
              ) : null}

              {!serviceOnlyAgreement && routeLegSelectionRequired ? (
                <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
                  <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                    Transporte (hoja de ruta)
                  </div>
                  <p className="vt-muted mt-1 text-[12px] leading-snug">
                    Podés incluir o excluir el transporte de la hoja de ruta en
                    este cobro (combinable con mercancía).
                  </p>
                  {!agreementRouteSheet ? (
                    <p className="vt-muted mt-2 text-[13px]">
                      No encontramos la hoja de ruta en este chat todavía. Abrí
                      el chat para sincronizar rutas y volvé a intentar.
                    </p>
                  ) : payableRoutePath == null ? (
                    <p className="vt-muted mt-2 text-[13px]">
                      {routePathsAwaitingCarriers.length > 0
                        ? "Hay transporte con precio, pero aún no se puede cobrar hasta que todos los transportistas de cada tramo estén confirmados en la hoja de ruta."
                        : "No hay transporte pendiente de cobro (o ya está pagado o parcialmente pagado)."}
                    </p>
                  ) : (
                    <>
                      <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] p-2.5 text-[13px] text-[var(--text)]">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={includeTransportInCharge}
                          disabled={busyInit || busyPay}
                          onChange={(e) => {
                            transportSelectionTouchedRef.current = true;
                            setIncludeTransportInCharge(e.target.checked);
                            setAcceptedInforme(false);
                          }}
                        />
                        <span className="min-w-0">
                          <span className="font-bold">
                            Incluir transporte en este cobro
                          </span>
                          <span className="vt-muted mt-0.5 block text-[12px]">
                            {payableRoutePath.label}
                            {payableRoutePath.totalsByCurrency.length > 0
                              ? ` · ${payableRoutePath.totalsByCurrency
                                  .map((t) => {
                                    const maj = minorToMajor(
                                      t.amountMinor,
                                      t.currencyLower,
                                    );
                                    return `${maj} ${t.currencyLower.toUpperCase()}`;
                                  })
                                  .join(" · ")}`
                              : ""}
                          </span>
                          <ul className="vt-muted mt-1 list-disc pl-4 text-[11px]">
                            {payableRoutePath.stops.map((s) => (
                              <li key={s.routeStopId}>
                                {s.orden}. {s.origen} → {s.destino}
                              </li>
                            ))}
                          </ul>
                        </span>
                      </label>
                      {agreementRoutePaths.some((p) => p.partiallyPaid) ? (
                        <p className="mt-2 text-[12px] text-amber-600 dark:text-amber-400">
                          Hay transporte parcialmente pagado: no se puede volver
                          a cobrar hasta regularizar el pago.
                        </p>
                      ) : null}
                    </>
                  )}
                </section>
              ) : null}

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

              {serviceOnlyAgreement || hybridServiceBlocks ? (
                <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
                  <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                    Servicios a pagar
                  </div>
                  <p className="vt-muted mt-1 text-[12px] leading-snug">
                    {serviceOnlyAgreement
                      ? "Este acuerdo contiene solo servicios. Selecciona uno o varios servicios y, para cada uno, la recurrencia a pagar. Las ya cobradas no aparecen."
                      : "Este acuerdo incluye servicios: marcá servicios y recurrencias si querés sumarlos a este cobro (podés combinarlos con mercancía y la hoja de ruta). Cada cambio actualiza el desglose."}
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
                          (selectedServiceEntriesByServiceId[sv.id]?.length ??
                            0) > 0;
                        const pickedKeys =
                          selectedServiceEntriesByServiceId[sv.id] ?? [];
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
                                Todas las recurrencias de este servicio ya
                                fueron cobradas.
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
                                  setSelectedServiceEntriesByServiceId(
                                    (prev) => {
                                      if (nextOn) {
                                        const first =
                                          unpaidEntryOptions[0]?.raw;
                                        const def = first
                                          ? [`${first.month}-${first.day}`]
                                          : [];
                                        return {
                                          ...prev,
                                          [sv.id]: prev[sv.id]?.length
                                            ? prev[sv.id]
                                            : def,
                                        };
                                      }
                                      const { [sv.id]: _drop, ...rest } = prev;
                                      return rest;
                                    },
                                  );
                                  setAcceptedInforme(false);
                                }}
                              />
                              <span className="min-w-0 break-words">
                                {sv.tipoServicio || "Servicio"}
                              </span>
                            </label>
                            {checked ? (
                              <div className="mt-2">
                                <div className="vt-muted mb-1 text-[11px] font-black uppercase tracking-wide">
                                  Recurrencias a pagar
                                </div>
                                <VtMultiSelect
                                  value={pickedKeys}
                                  onChange={(next) => {
                                    setSelectedServiceEntriesByServiceId(
                                      (prev) => {
                                        if (next.length === 0) {
                                          const { [sv.id]: _drop, ...rest } =
                                            prev;
                                          return rest;
                                        }
                                        return { ...prev, [sv.id]: next };
                                      },
                                    );
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

              {!checkoutSelectionsReady &&
              !(
                serviceOnlyAgreement &&
                allRecurrencesPaidVerified &&
                !busyPay
              ) ? (
                <div className="rounded-2xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-[13px] leading-snug text-[var(--text)]">
                  {serviceOnlyAgreement
                    ? "Selecciona al menos un servicio y una recurrencia para ver el desglose de pago."
                    : "Marcá al menos una opción: mercancía, tramo de ruta o cuota de servicio (según corresponda al acuerdo)."}
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
              ) : breakdown &&
                breakdown.ok &&
                breakdown.byCurrency.length === 0 ? (
                <div className="vt-muted text-[13px]">
                  Sin montos a cobrar en este momento.
                </div>
              ) : breakdown &&
                breakdown.ok &&
                breakdown.byCurrency.length > 0 ? (
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
                              <span className="font-black">Aviso:</span> Climate
                              + Stripe estimado (~
                              {fmt(refCombo, c)}) es solo referencia; no se suma
                              al cobro con tarjeta ({fmt(bc.totalMinor, c)}).
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-[13px] font-black">
                                Moneda {c.toUpperCase()}
                                {paid ? (
                                  <span className="vt-muted ml-2 text-[11px] font-bold">
                                    — cobro OK
                                  </span>
                                ) : null}
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
                                Referencia Climate (
                                {paymentFeeLabels.climateRateDisplay}):{" "}
                                {fmt(bc.climateMinor, c)} · Tarifa Stripe est. (
                                {paymentFeeLabels.stripePctDisplay}
                                ): {fmt(bc.stripeFeeMinor, c)} · Combinado ref.:{" "}
                                {fmt(refCombo, c)}
                              </div>
                            </div>
                            <ul className="mt-1.5 list-none space-y-2 text-[12px] text-[var(--text)] opacity-92">
                              {bc.lines.map((ln, ix) => (
                                <li
                                  key={`${ln.label}-${ix}`}
                                  className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-[color-mix(in_oklab,var(--border)_55%,transparent)] pb-2 last:border-b-0 last:pb-0"
                                >
                                  <span className="min-w-0 max-w-full flex-[1_1_10rem] break-words [overflow-wrap:anywhere] leading-snug">
                                    <span className="font-bold text-[var(--muted)]">
                                      •{" "}
                                    </span>
                                    {sanitizePaymentInformeLabel(ln.label)}
                                  </span>
                                  <span className="ml-auto shrink-0 font-mono font-semibold tabular-nums">
                                    {fmt(ln.amountMinor, c)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {previews.length > 0 ? (
                    <section>
                      <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                        Previsualización de adjuntos
                      </div>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        {previews.map((p) =>
                          p.kind === "image" ? (
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
                          ) : (
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
                  ) : null}

                  <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] p-3 text-[13px] leading-snug">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={acceptedInforme || allPaid}
                      onChange={(e) => setAcceptedInforme(e.target.checked)}
                    />
                    <span>
                      Confirmé el desglose: el cobro es el subtotal del acuerdo;
                      las líneas Climate y Stripe son referencias informativas.
                      Revisé conceptos incluidos y adjuntos del vendedor antes
                      de pagar con Stripe.
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
                  No pudimos obtener el informe desde el servidor. Revisa la
                  conexión o volvé a intentar más tarde.
                </p>
              ) : null}

              {!allPaid && breakdown?.ok ? (
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
              ) : null}
            </>
          )}
        </div>

        <div className="vt-modal-actions flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3">
          {allPaid &&
          !(serviceOnlyAgreement && allRecurrencesPaidVerified && !busyPay) ? (
            <div className="rounded-xl px-3 py-2 text-[13px] font-bold text-emerald-600">
              Cobros listos en todas las monedas necesarias del acuerdo.
            </div>
          ) : null}

          {!allPaid && hasAgreement && !cards.length ? (
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
          ) : null}

          {!allPaid &&
          hasAgreement &&
          cards.length > 0 &&
          pendingCurrencies.length > 0 ? (
            <div className="flex flex-col gap-3">
              {(() => {
                const cur = pendingCurrencies[0]?.trim() ?? "";
                const curOk = cur.length >= 3;
                const payDisabled =
                  busyPay ||
                  !acceptedInforme ||
                  !selectedCardId.trim() ||
                  !curOk ||
                  !checkoutSelectionsReady;
                return (
                  <div className="flex flex-col gap-2 rounded-xl border border-[color-mix(in_oklab,var(--border)_88%,transparent)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] p-2.5 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-2">
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
                        onClick={() => void handlePayCurrency(cur)}
                      >
                        {busyPay ? "Procesando…" : `Pagar ${cur.toUpperCase()}`}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}

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
