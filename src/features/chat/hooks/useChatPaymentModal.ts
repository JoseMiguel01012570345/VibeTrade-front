import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import { useNavigate } from "react-router-dom";
import type { AgreementCheckoutBreakdownApi, AgreementPaymentStatusApi, AgreementRoutePathApi } from "@features/chat/Dtos/agreement/agreementCheckoutApiTypes";
import { executeAgreementCurrencyPayment, fetchAgreementCheckoutBreakdown, fetchAgreementPaymentStatuses, fetchAgreementRoutePaths } from "@features/chat/api/agreementCheckoutApi";
import type { RouteStopDeliveryStatusApi } from "@features/chat/Dtos/route-sheet/routeLogisticsApiTypes";
import { fetchAgreementRouteDeliveries } from "@features/chat/api/routeLogisticsApi";
import type { AgreementServicePaymentApi } from "@features/chat/Dtos/agreement/agreementServiceEvidenceApiTypes";
import { listAgreementServicePayments } from "@features/chat/api/agreementServiceEvidenceApi";
import {
  getPaymentGatewayConfig,
  listSavedCards,
  type SavedCard,
} from "@features/payments";
import {
  beginChatPaymentExecute,
  endChatPaymentExecute,
} from "@features/chat/logic/realtime/chatRealtime";
import { useAppStore } from "@features/auth/logic/useAppStore";
import {
  agreementDeclaresMerchandise,
  agreementDeclaresService,
  normalizeAgreementServices,
  normalizeMerchandiseLine,
} from "@features/chat/logic/agreement/tradeAgreementTypes";
import { PAYMENT_FEE_POLICY_URL } from "@features/payments/logic/paymentFeePolicyLinks";
import type { ChatPaymentModalProps } from "@features/chat/Dtos/payments/chatPaymentModalTypes";
import {
  computeAllSlotsPaid,
  currencyPaid,
  deliveryMarksStopPaid,
  fmtPaymentAmount as fmt,
  parseMajorAmount,
  recurrenceSlotKey,
  sameStringArray,
  shouldWarnUnconfirmedRouteCarriers,
} from "@features/chat/logic/payments/chatPaymentUtils";
import {
  downloadPaymentCheckoutInformePdf,
} from "@features/chat/logic/payments/paymentCheckoutPdfDownload";
import { collectAgreementInformePreviewEntries } from "@features/chat/logic/agreement/tradeAgreementPdfText";
import type { VtSelectOption } from "@shared/components/ui/VtSelect";

export function useChatPaymentModal({
  open,
  threadId,
  agreements,
  routeSheets = [],
  onClose,
  onPaymentFullySettled,
}: ChatPaymentModalProps) {
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
  const [cards, setCards] = useState<SavedCard[]>([]);
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
    void QRCode.toDataURL(PAYMENT_FEE_POLICY_URL, {
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
        await getPaymentGatewayConfig();
        const cs = await listSavedCards();
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
      await getPaymentGatewayConfig();
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

      if (!r.accepted && r.errorCode === "payment_account_missing") {
        toast.error(
          r.paymentErrorMessage ??
            "Debés activar una tarjeta demo en tu perfil.",
        );
        return;
      }
      if (!r.accepted && r.errorCode === "checkout_invalid") {
        toast.error(r.paymentErrorMessage ?? "Los montos ya no aplican.");
        await reloadCheckout();
        return;
      }
      if (!r.accepted && r.errorCode === "recurrence_already_paid") {
        toast.error(
          r.paymentErrorMessage ??
            "Esa recurrencia ya fue cobrada. Actualizamos el listado.",
        );
        await reloadCheckout();
        return;
      }
      if (!r.accepted && r.errorCode === "route_path_already_paid") {
        toast.error(
          r.paymentErrorMessage ??
            "Esa ruta ya fue cobrada en esa moneda. Actualizamos el listado.",
        );
        await reloadCheckout();
        return;
      }
      if (!r.accepted && r.errorCode === "merchandise_line_already_paid") {
        toast.error(
          r.paymentErrorMessage ??
            "Esa mercadería ya fue cobrada en esa moneda. Actualizamos el listado.",
        );
        await reloadCheckout();
        return;
      }
      if (!r.accepted && r.errorCode === "already_paid") {
        toast.error(
          r.paymentErrorMessage ??
            "Ya hay un cobro registrado para esa moneda en este acuerdo.",
        );
        await reloadCheckout();
        return;
      }
      if (!r.accepted && r.errorCode === "agreement_currency_mismatch") {
        toast.error(
          r.paymentErrorMessage ??
            "Este acuerdo ya tiene un cobro en otra moneda; no se puede cobrar en otra.",
        );
        await reloadCheckout();
        return;
      }

      if (!r.succeeded) {
        if ((r.paymentErrorMessage ?? "").trim())
          toast.error(r.paymentErrorMessage!.trim());
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
  const hasAgreement = agreements.length > 0;

  return {
    nav,
    me,
    hasAgreement,
    busyInit,
    busyPay,
    agreementId,
    setAgreementId,
    breakdown,
    cards,
    selectedCardId,
    setSelectedCardId,
    acceptedInforme,
    setAcceptedInforme,
    feePolicyQrDataUrl,
    selectedAgreement,
    agreementRouteSheet,
    agreementRoutePaths,
    includeTransportInCharge,
    setIncludeTransportInCharge,
    selectedMerchandiseLineIds,
    setSelectedMerchandiseLineIds,
    carrierWarningOpen,
    setCarrierWarningOpen,
    carrierWarningSheetTitle,
    serviceOnlyAgreement,
    routePathsAwaitingCarriers,
    routeLegSelectionRequired,
    payableRoutePath,
    payableMerchLines,
    merchCheckboxSectionVisible,
    selectedServiceEntriesByServiceId,
    setSelectedServiceEntriesByServiceId,
    serviceItems,
    transportSelectionTouchedRef,
    hybridServiceBlocks,
    checkoutSelectionsReady,
    previews,
    agreementOptions,
    cardOptions,
    pendingCurrencies,
    allPaid,
    paidRecurrenceSummaryLines,
    allRecurrencesPaidVerified,
    paidSlotKeys,
    informeCurrencyPaidDisplay,
    fmt,
    handlePayCurrency,
    handlePdfDownload,
  };
}

export type UseChatPaymentModalReturn = ReturnType<typeof useChatPaymentModal>;
