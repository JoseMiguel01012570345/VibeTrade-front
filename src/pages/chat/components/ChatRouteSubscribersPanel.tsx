import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import toast from "react-hot-toast";
import type { RouteOfferPublicState } from "../../../app/store/marketStoreTypes";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { cn } from "../../../lib/cn";
import type { RouteSheetPayload } from "../domain/routeSheetTypes";
import {
  fetchThreadRouteSheets,
  fetchThreadRouteTramoSubscriptions,
  postAcceptRouteTramoSubscriptions,
  postRejectRouteTramoSubscriptions,
  postSellerExpelCarrier,
  type RouteTramoSubscriptionItemApi,
} from "../../../utils/chat/chatApi";
import { subscribeRouteTramoSubscriptionsChanged } from "../../../utils/chat/chatRealtime";
import {
  buildRouteSheetsMetaForGrouping,
  collectRouteOfferSubscribersForThreadSheets,
  groupSubscribersByRouteSheetThenTramo,
  subscribersFromApiRouteTramoItems,
  type RouteOfferTramoSubscriberGroup,
  type RouteOfferSubscriberSummary,
  type RouteSheetSubscriberSection,
} from "../domain/routeOfferSubscribers";
import { onBackdropPointerClose } from "../lib/modalClose";
import { modalShellWide, modalSub } from "../styles/formModalStyles";
import { railItemClass } from "./rail/chatRailStyles";

type Props = {
  threadId: string;
  routeOffer: RouteOfferPublicState | undefined;
  /** Hoja desde la que se abrió el visor (rail o deep link); foco inicial entre varias hojas. */
  contextRouteSheetId: string;
  /** Hojas del hilo (orden y títulos para el agrupado). */
  routeSheets: { id: string; titulo: string }[];
  /** Solo vendedor del hilo: aceptar o rechazar suscripciones en servidor. */
  canSellerManageRouteSubscriptions?: boolean;
  onSubscriptionsChanged?: () => void | Promise<void>;
  onClose: () => void;
  /** Desde notificación: abrir detalle y resaltar. */
  highlightUserId?: string | null;
  /** Tras GET /route-sheets: alinear `thread.routeSheets` en el store con el servidor. */
  onThreadRouteSheetsSynced?: (sheets: RouteSheetPayload[]) => void;
};

function countUniqueCarriersInSection(section: RouteSheetSubscriberSection) {
  const ids = new Set<string>();
  for (const g of section.tramoGroups) {
    for (const c of g.carriers) ids.add(c.userId);
  }
  return ids.size;
}

function statusLabel(s: RouteOfferSubscriberSummary["tramos"][0]["status"]) {
  if (s === "confirmed") return "Confirmado";
  return "Pendiente de validación";
}

function serviceHrefForSubscriber(sub: RouteOfferSubscriberSummary): string | null {
  const sid = sub.storeServiceId?.trim();
  if (!sid) return null;
  return `/offer/${encodeURIComponent(sid)}`;
}

export function ChatRouteSubscribersPanel({
  threadId,
  routeOffer,
  contextRouteSheetId,
  routeSheets,
  canSellerManageRouteSubscriptions = false,
  onSubscriptionsChanged,
  onClose,
  highlightUserId,
  onThreadRouteSheetsSynced,
}: Props) {
  const [focusRouteSheetId, setFocusRouteSheetId] = useState<string | null>(null);
  const [focusTramoId, setFocusTramoId] = useState<string | null>(null);
  const [focusCarrierId, setFocusCarrierId] = useState<string | null>(null);
  const didAutoFocusRouteSheet = useRef(false);
  const focusNavRef = useRef({ focusRouteSheetId, focusTramoId });
  focusNavRef.current = { focusRouteSheetId, focusTramoId };
  const autoOpenedForHi = useRef<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [subsLoadState, setSubsLoadState] = useState<"loading" | "ok" | "error">("loading");
  const [serverSubs, setServerSubs] = useState<RouteOfferSubscriberSummary[]>([]);
  /** Última respuesta cruda del API (ids de hoja por fila). */
  const [lastRawSubscriptionItems, setLastRawSubscriptionItems] = useState<
    RouteTramoSubscriptionItemApi[]
  >([]);
  /** GET /route-sheets al abrir el visor o tras evento en tiempo real. */
  const [fetchedRouteSheets, setFetchedRouteSheets] = useState<RouteSheetPayload[] | null>(null);
  const routeSheetsPropsRef = useRef(routeSheets);
  routeSheetsPropsRef.current = routeSheets;
  const fetchedRouteSheetsRef = useRef(fetchedRouteSheets);
  fetchedRouteSheetsRef.current = fetchedRouteSheets;
  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [rejectBusy, setRejectBusy] = useState(false);
  const [expelOpen, setExpelOpen] = useState(false);
  const [expelReason, setExpelReason] = useState("");
  const [expelBusy, setExpelBusy] = useState(false);
  const expelTitleId = useId();

  const routeSheetsMeta = useMemo(
    () =>
      buildRouteSheetsMetaForGrouping(
        fetchedRouteSheets,
        routeSheets,
        lastRawSubscriptionItems,
      ),
    [fetchedRouteSheets, routeSheets, lastRawSubscriptionItems],
  );

  const reloadSubscriptions = () => {
    const tid = threadId?.trim();
    if (!tid) return;
    setSubsLoadState("loading");
    void Promise.all([
      fetchThreadRouteTramoSubscriptions(tid),
      fetchThreadRouteSheets(tid).catch(() => [] as RouteSheetPayload[]),
    ])
      .then(([items, sheets]) => {
        setLastRawSubscriptionItems(items);
        setServerSubs(subscribersFromApiRouteTramoItems(items));
        setFetchedRouteSheets(sheets);
        onThreadRouteSheetsSynced?.(sheets);
        setSubsLoadState("ok");
      })
      .catch(() => {
        setServerSubs([]);
        setLastRawSubscriptionItems([]);
        setSubsLoadState("error");
      });
  };

  useEffect(() => {
    let cancelled = false;
    setSubsLoadState("loading");
    setServerSubs([]);
    setLastRawSubscriptionItems([]);
    setFetchedRouteSheets(null);
    const tid = threadId?.trim();
    if (!tid) {
      setSubsLoadState("error");
      return () => {
        cancelled = true;
      };
    }
    void Promise.all([
      fetchThreadRouteTramoSubscriptions(tid),
      fetchThreadRouteSheets(tid).catch(() => [] as RouteSheetPayload[]),
    ])
      .then(([items, sheets]) => {
        if (cancelled) return;
        setLastRawSubscriptionItems(items);
        setServerSubs(subscribersFromApiRouteTramoItems(items));
        setFetchedRouteSheets(sheets);
        onThreadRouteSheetsSynced?.(sheets);
        setSubsLoadState("ok");
      })
      .catch(() => {
        if (cancelled) return;
        setServerSubs([]);
        setLastRawSubscriptionItems([]);
        setSubsLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, onThreadRouteSheetsSynced]);

  useEffect(() => {
    const tid = threadId.trim();
    if (tid.length < 4) return () => {};

    const unsub = subscribeRouteTramoSubscriptionsChanged((p) => {
      if (p.threadId !== tid) return;
      setLastRawSubscriptionItems(p.items);
      const next = subscribersFromApiRouteTramoItems(p.items);
      setServerSubs(next);
      setSubsLoadState("ok");
      const meta = buildRouteSheetsMetaForGrouping(
        fetchedRouteSheetsRef.current,
        routeSheetsPropsRef.current,
        p.items,
      );
      const sections = groupSubscribersByRouteSheetThenTramo(next, meta);
      const { focusRouteSheetId: fr, focusTramoId: ft } = focusNavRef.current;
      if (ft) {
        const tramoOk =
          (fr
            && sections
              .find((s) => s.routeSheetId === fr)
              ?.tramoGroups.some((g) => g.stopId === ft)) ??
          false;
        if (!tramoOk) {
          setFocusTramoId(null);
          setFocusCarrierId(null);
        }
      }
      void fetchThreadRouteSheets(tid)
        .then((sheets) => {
          setFetchedRouteSheets(sheets);
          onThreadRouteSheetsSynced?.(sheets);
        })
        .catch(() => {});
      const ch = p.change.toLowerCase();
      if (ch === "accept" || ch === "reject" || ch === "withdraw") {
        void onSubscriptionsChanged?.();
      }
    });
    return unsub;
  }, [threadId, onSubscriptionsChanged, onThreadRouteSheetsSynced]);

  const subscribers = useMemo(() => {
    const local = collectRouteOfferSubscribersForThreadSheets(routeOffer, routeSheetsMeta);
    if (subsLoadState === "error") return local;
    if (subsLoadState === "loading") return [];
    if (serverSubs.length > 0) return serverSubs;
    return local;
  }, [subsLoadState, serverSubs, routeOffer, routeSheetsMeta]);

  const sheetSections = useMemo(
    () => groupSubscribersByRouteSheetThenTramo(subscribers, routeSheetsMeta),
    [subscribers, routeSheetsMeta],
  );

  const multiSheets = sheetSections.length > 1;

  useEffect(() => {
    didAutoFocusRouteSheet.current = false;
  }, [contextRouteSheetId, threadId]);

  useEffect(() => {
    if (subsLoadState === "loading") return;
    if (sheetSections.length === 0) {
      setFocusRouteSheetId(null);
      return;
    }
    if (didAutoFocusRouteSheet.current) return;
    didAutoFocusRouteSheet.current = true;
    if (sheetSections.length === 1) {
      // Una sola hoja: se puede ir directo a tramos; no hay “lista de hojas” útil.
      setFocusRouteSheetId(sheetSections[0].routeSheetId);
    } else {
      // Varias hojas: al abrir siempre el listado de hojas, no entrar a la que abrió el botón del rail.
      setFocusRouteSheetId(null);
    }
  }, [contextRouteSheetId, sheetSections, subsLoadState]);

  const tramoGroups: RouteOfferTramoSubscriberGroup[] = useMemo(() => {
    if (focusRouteSheetId == null) return [];
    return (
      sheetSections.find((s) => s.routeSheetId === focusRouteSheetId)?.tramoGroups ?? []
    );
  }, [sheetSections, focusRouteSheetId]);

  const currentSheetTitle = useMemo(() => {
    if (!focusRouteSheetId) return null;
    return (
      routeSheetsMeta.find((r) => r.id === focusRouteSheetId)?.titulo?.trim() ??
        sheetSections.find((s) => s.routeSheetId === focusRouteSheetId)?.titulo ??
        "Hoja de ruta"
    );
  }, [focusRouteSheetId, routeSheetsMeta, sheetSections]);

  const atRouteSheetList = multiSheets && focusRouteSheetId == null;

  const selectedTramo: RouteOfferTramoSubscriberGroup | null =
    focusTramoId && focusRouteSheetId
      ? (tramoGroups.find(
          (g) => g.stopId === focusTramoId && g.routeSheetId === focusRouteSheetId,
        ) ?? null)
      : null;
  const selectedCarrier =
    selectedTramo && focusCarrierId
      ? (selectedTramo.carriers.find((c) => c.userId === focusCarrierId) ?? null)
      : null;

  useEffect(() => {
    if (focusRouteSheetId == null && focusTramoId != null) {
      setFocusTramoId(null);
      setFocusCarrierId(null);
    }
  }, [focusRouteSheetId, focusTramoId]);

  useEffect(() => {
    if (!focusTramoId) {
      setFocusCarrierId(null);
      return;
    }
    if (!tramoGroups.some((g) => g.stopId === focusTramoId)) {
      setFocusTramoId(null);
      setFocusCarrierId(null);
    }
  }, [tramoGroups, focusTramoId]);

  useEffect(() => {
    if (!focusCarrierId || !focusTramoId) return;
    const g = tramoGroups.find((x) => x.stopId === focusTramoId);
    if (!g?.carriers.some((c) => c.userId === focusCarrierId)) {
      setFocusCarrierId(null);
    }
  }, [tramoGroups, focusTramoId, focusCarrierId]);

  const hi = highlightUserId?.trim() ?? "";

  useEffect(() => {
    if (!hi) {
      autoOpenedForHi.current = null;
      return;
    }
    if (autoOpenedForHi.current === hi) return;
    for (const sec of sheetSections) {
      const g = sec.tramoGroups.find((gr) => gr.carriers.some((c) => c.userId === hi));
      if (g) {
        autoOpenedForHi.current = hi;
        setFocusRouteSheetId(g.routeSheetId);
        setFocusTramoId(g.stopId);
        setFocusCarrierId(hi);
        requestAnimationFrame(() => {
          rowRefs.current[hi]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
        return;
      }
    }
  }, [hi, sheetSections]);

  const showHighlightRing = hi.length > 0 && selectedCarrier?.userId === hi;

  const selectedServiceHref = selectedCarrier ? serviceHrefForSubscriber(selectedCarrier) : null;

  const tramoRowForSelection = selectedCarrier?.tramos.find(
    (t) =>
      t.stopId === focusTramoId &&
      (focusRouteSheetId == null || t.routeSheetId === focusRouteSheetId),
  );

  const anotherConfirmedOnThisStop = useMemo(() => {
    if (!focusTramoId || !focusCarrierId || !focusRouteSheetId) return false;
    return subscribers.some(
      (sub) =>
        sub.userId !== focusCarrierId &&
        sub.tramos.some(
          (t) =>
            t.routeSheetId === focusRouteSheetId &&
            t.stopId === focusTramoId &&
            t.status === "confirmed",
        ),
    );
  }, [subscribers, focusTramoId, focusCarrierId, focusRouteSheetId]);

  const selectedCarrierHasConfirmedTramo = useMemo(() => {
    if (!selectedCarrier) return false;
    return selectedCarrier.tramos.some((t) => t.status === "confirmed");
  }, [selectedCarrier]);

  const selectedHasPending = tramoRowForSelection?.status === "pending";
  const selectedHasAcceptablePending = !!selectedHasPending && !anotherConfirmedOnThisStop;

  async function confirmAcceptSubscriber() {
    if (!selectedCarrier || !canSellerManageRouteSubscriptions || !focusTramoId) return;
    const tid = threadId.trim();
    const rsid = (selectedTramo?.routeSheetId ?? focusRouteSheetId ?? "").trim();
    const cid = selectedCarrier.userId.trim();
    const stopId = focusTramoId.trim();
    if (!tid || !rsid || !cid || !stopId) return;
    setAcceptBusy(true);
    try {
      const { acceptedCount } = await postAcceptRouteTramoSubscriptions(tid, {
        routeSheetId: rsid,
        carrierUserId: cid,
        stopId,
      });
      if (acceptedCount < 1) {
        toast.error("No había solicitud pendiente para confirmar en este tramo.");
      } else {
        toast.success(
          acceptedCount === 1 ?
            "Suscripción confirmada en este tramo. Se notificó al transportista."
          : `${acceptedCount} suscripciones confirmadas. Se notificó al transportista.`,
        );
      }
      setConfirmAcceptOpen(false);
      reloadSubscriptions();
      await onSubscriptionsChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo confirmar.";
      toast.error(msg);
    } finally {
      setAcceptBusy(false);
    }
  }

  async function confirmExpelSubscriber() {
    if (!selectedCarrier || !canSellerManageRouteSubscriptions) return;
    if (!selectedCarrierHasConfirmedTramo) {
      toast.error(
        "Solo podés expulsar a un transportista que tenga al menos un tramo confirmado.",
      );
      return;
    }
    const tid = threadId.trim();
    const cid = selectedCarrier.userId.trim();
    const rsn = expelReason.trim();
    if (!tid || !cid || rsn.length < 1) {
      toast.error("Indicá un motivo para retirar al transportista.");
      return;
    }
    setExpelBusy(true);
    try {
      const r = await postSellerExpelCarrier(tid, {
        carrierUserId: cid,
        reason: rsn,
      });
      if (r.withdrawnRowCount < 1) {
        toast.error("No había suscripciones activas para retirar.");
      } else {
        toast.success(
          r.applyStoreTrustPenalty ?
            "Transportista retirado. Se le notificó; en la demo se aplicó un ajuste a la confianza de la tienda."
          : "Transportista retirado de la operación. Se le notificó con el motivo.",
        );
      }
      setExpelOpen(false);
      setExpelReason("");
      setFocusCarrierId(null);
      reloadSubscriptions();
      await onSubscriptionsChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo retirar al transportista.";
      toast.error(msg);
    } finally {
      setExpelBusy(false);
    }
  }

  async function confirmRejectSubscriber() {
    if (!selectedCarrier || !canSellerManageRouteSubscriptions || !focusTramoId) return;
    const tid = threadId.trim();
    const rsid = (selectedTramo?.routeSheetId ?? focusRouteSheetId ?? "").trim();
    const cid = selectedCarrier.userId.trim();
    const stopId = focusTramoId.trim();
    if (!tid || !rsid || !cid || !stopId) return;
    setRejectBusy(true);
    try {
      const { rejectedCount } = await postRejectRouteTramoSubscriptions(tid, {
        routeSheetId: rsid,
        carrierUserId: cid,
        stopId,
      });
      if (rejectedCount < 1) {
        toast.error("No había solicitud pendiente para rechazar en este tramo.");
      } else {
        toast.success(
          rejectedCount === 1 ?
            "Solicitud rechazada en este tramo. Se notificó al transportista."
          : `${rejectedCount} solicitudes rechazadas. Se notificó al transportista.`,
        );
      }
      setConfirmRejectOpen(false);
      setFocusCarrierId(null);
      reloadSubscriptions();
      await onSubscriptionsChanged?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo rechazar.";
      toast.error(msg);
    } finally {
      setRejectBusy(false);
    }
  }

  function headerTitle() {
    if (selectedCarrier) {
      return (
        <button
          type="button"
          className="m-0 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-left text-[13px] font-extrabold text-[var(--primary)]"
          onClick={() => setFocusCarrierId(null)}
        >
          <ArrowLeft size={14} aria-hidden /> Volver
        </button>
      );
    }
    if (selectedTramo) {
      return (
        <button
          type="button"
          className="m-0 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-left text-[13px] font-extrabold text-[var(--primary)]"
          onClick={() => {
            setFocusTramoId(null);
            setFocusCarrierId(null);
          }}
        >
          <ArrowLeft size={14} aria-hidden /> Volver
        </button>
      );
    }
    if (focusRouteSheetId && !focusTramoId) {
      return (
        <button
          type="button"
          className="m-0 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-left text-[13px] font-extrabold text-[var(--primary)]"
          onClick={() => {
            if (multiSheets) {
              setFocusRouteSheetId(null);
              setFocusTramoId(null);
              setFocusCarrierId(null);
            } else {
              onClose();
            }
          }}
        >
          <ArrowLeft size={14} aria-hidden /> Volver
        </button>
      );
    }
    return "Suscriptores";
  }

  return (
    <>
      <aside
        className={cn(
          "flex max-h-full min-h-0 w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_4px_24px_rgba(15,23,42,0.08)]",
          "max-[640px]:max-h-[42vh] max-[640px]:w-full",
          showHighlightRing &&
            "ring-2 ring-[color-mix(in_oklab,var(--primary)_55%,var(--border))] ring-offset-2 ring-offset-[var(--surface)]",
        )}
        aria-label="Suscriptores a la oferta pública, agrupados por hoja de ruta y tramo"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
              Oferta publicada
            </div>
            <div className="mt-0.5 truncate text-[13px] font-extrabold leading-tight text-[var(--text)]">
              {headerTitle()}
            </div>
            {atRouteSheetList ? (
              <p className="vt-muted mb-0 mt-1 line-clamp-2 text-[11px] leading-snug">
                Elegí una hoja de ruta para ver tramos y suscriptores.
              </p>
            ) : null}
            {currentSheetTitle && !atRouteSheetList && !selectedTramo ? (
              <p className="vt-muted mb-0 mt-1 line-clamp-2 text-[11px] leading-snug">
                {currentSheetTitle}
              </p>
            ) : null}
            {selectedTramo && !selectedCarrier ? (
              <p className="vt-muted mb-0 mt-1 line-clamp-2 text-[11px] leading-snug">
                Tramo {selectedTramo.orden}: {selectedTramo.origenLine} → {selectedTramo.destinoLine}
              </p>
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
          {selectedCarrier && focusTramoId && focusRouteSheetId ? (
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
              <div className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">
                Tramo {tramoRowForSelection?.orden ?? "—"}
              </div>
              <p className="mb-0 mt-0.5 text-[11px] font-semibold leading-snug text-[var(--text)]">
                {selectedTramo?.origenLine} → {selectedTramo?.destinoLine}
              </p>
              <div className="mt-3 text-[15px] font-black leading-tight">{selectedCarrier.displayName}</div>
              <p className="vt-muted mb-0 mt-2 text-[11px] leading-snug">
                <span className="font-extrabold text-[var(--text)]">Confianza: </span>
                {selectedCarrier.trustScore}
              </p>
              <p className="mb-0 mt-1.5 text-[11px] leading-snug">
                <span className="font-extrabold text-[var(--muted)]">Teléfono: </span>
                <span className="font-mono font-semibold tabular-nums text-[var(--text)]">
                  {selectedCarrier.phone?.trim() || "—"}
                </span>
              </p>
              <div className="mt-3 rounded-lg border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-2.5 py-2">
                <div className="text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">
                  Servicio de transporte
                </div>
                <p className="mb-0 mt-1 text-[12px] font-semibold leading-snug text-[var(--text)]">
                  {selectedCarrier.transportServiceLabel?.trim() || "No indicó servicio al suscribirse"}
                </p>
                {selectedServiceHref ? (
                  <Link
                    to={selectedServiceHref}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold text-[var(--primary)] no-underline hover:underline"
                  >
                    Ver ficha del servicio <ExternalLink size={12} aria-hidden />
                  </Link>
                ) : null}
              </div>
              {canSellerManageRouteSubscriptions && selectedHasPending ? (
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    className="vt-btn vt-btn-primary w-full text-[12px] font-extrabold"
                    disabled={!selectedHasAcceptablePending}
                    title={
                      !selectedHasAcceptablePending ?
                        "En este tramo ya hay otro transportista confirmado."
                      : undefined
                    }
                    onClick={() => setConfirmAcceptOpen(true)}
                  >
                    Aceptar en este tramo
                  </button>
                  <button
                    type="button"
                    className="vt-btn w-full border-[color-mix(in_oklab,var(--bad)_45%,var(--border))] text-[12px] font-extrabold text-[var(--bad)]"
                    onClick={() => setConfirmRejectOpen(true)}
                  >
                    Rechazar en este tramo
                  </button>
                </div>
              ) : null}
              {canSellerManageRouteSubscriptions && selectedCarrier ? (
                <div className="mt-4 border-t border-[var(--border)] pt-3">
                  <p className="mb-2 mt-0 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                    Toda la operación
                  </p>
                  {selectedCarrierHasConfirmedTramo ? (
                    <>
                      <p className="vt-muted mb-2 text-[11px] leading-snug">
                        Retirá a este transportista de todos los tramos de este hilo. Solo aplica con al menos un tramo
                        confirmado: el transportista recibe el aviso y la confianza de la tienda puede ajustarse (demo).
                      </p>
                      <button
                        type="button"
                        className="vt-btn w-full border-[color-mix(in_oklab,var(--bad)_50%,var(--border))] text-[12px] font-extrabold text-[var(--bad)]"
                        onClick={() => {
                          setExpelReason("");
                          setExpelOpen(true);
                        }}
                      >
                        Expulsar de la operación
                      </button>
                    </>
                  ) : (
                    <p className="mb-0 text-[11px] font-semibold leading-snug text-[var(--muted)]">
                      No podés expulsar mientras el transportista no tenga al menos un tramo confirmado. Rechazá
                      la solicitud en cada tramo pendiente o confirmá y luego retirá si corresponde.
                    </p>
                  )}
                </div>
              ) : null}
              {tramoRowForSelection ? (
                <div
                  className={cn(
                    "mt-3 text-[10px] font-bold",
                    tramoRowForSelection.status === "confirmed" ?
                      "text-[color-mix(in_oklab,var(--good)_85%,var(--muted))]"
                    : "text-[color-mix(in_oklab,var(--primary)_88%,var(--muted))]",
                  )}
                >
                  {statusLabel(tramoRowForSelection.status)}
                </div>
              ) : null}
              {anotherConfirmedOnThisStop && selectedHasPending ? (
                <p className="mb-0 mt-2 text-[10px] font-semibold text-[var(--bad)]">
                  Otro transportista ya está confirmado en este tramo.
                </p>
              ) : null}
            </div>
          ) : selectedTramo ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {selectedTramo.carriers.map((sub) => (
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
                    onClick={() => setFocusCarrierId(sub.userId)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-left text-[13px] font-extrabold leading-tight">{sub.displayName}</span>
                      <span className="shrink-0 text-[10px] font-bold text-[var(--muted)]">
                        {(() => {
                          const tr = sub.tramos.find(
                            (t) =>
                              t.stopId === selectedTramo.stopId &&
                              t.routeSheetId === selectedTramo.routeSheetId,
                          );
                          return tr ? statusLabel(tr.status) : "—";
                        })()}
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
          ) : subsLoadState === "loading" ? (
            <p className="vt-muted px-1 py-2 text-[12px] leading-snug">Cargando suscripciones…</p>
          ) : sheetSections.length === 0 ? (
            <p className="vt-muted px-1 py-2 text-[12px] leading-snug">
              Todavía no hay transportistas suscritos a ninguna hoja de ruta en la oferta pública.
            </p>
          ) : atRouteSheetList ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {sheetSections.map((sec) => {
                const nCar = countUniqueCarriersInSection(sec);
                return (
                  <li key={sec.routeSheetId}>
                    <button
                      type="button"
                      className={railItemClass}
                      onClick={() => {
                        setFocusRouteSheetId(sec.routeSheetId);
                        setFocusTramoId(null);
                        setFocusCarrierId(null);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 text-left text-[13px] font-extrabold leading-tight">
                          {sec.titulo}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-[var(--muted)]">
                          {nCar}
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-left text-[11px] leading-snug text-[var(--muted)]">
                        {sec.tramoGroups.length} tramo{sec.tramoGroups.length === 1 ? "" : "s"} · {nCar}{" "}
                        transportista
                        {nCar === 1 ? "" : "s"}
                      </div>
                      <ChevronRight
                        size={16}
                        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-45"
                        aria-hidden
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : tramoGroups.length === 0 ? (
            <p className="vt-muted px-1 py-2 text-[12px] leading-snug">
              No hay suscriptores en los tramos de esta hoja.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {tramoGroups.map((g) => (
                <li key={`${g.routeSheetId}-${g.stopId}`}>
                  <button
                    type="button"
                    className={railItemClass}
                    onClick={() => {
                      setFocusTramoId(g.stopId);
                      setFocusCarrierId(null);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-left text-[13px] font-extrabold leading-tight">
                        Tramo {g.orden}
                      </span>
                      <span className="shrink-0 text-[10px] font-bold text-[var(--muted)]">
                        {g.carriers.length} transportista{g.carriers.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 text-left text-[11px] leading-snug text-[var(--muted)]">
                      {g.origenLine} → {g.destinoLine}
                    </div>
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

      <ConfirmModal
        open={confirmAcceptOpen}
        title="Confirmar transportista"
        message="¿Confirmar a este transportista solo en este tramo? Se actualizará la hoja con su contacto y recibirá un aviso para abrir este chat."
        confirmLabel="Sí, confirmar"
        cancelLabel="Cancelar"
        confirmBusy={acceptBusy}
        onCancel={() => {
          if (!acceptBusy) setConfirmAcceptOpen(false);
        }}
        onConfirm={() => void confirmAcceptSubscriber()}
      />

      <ConfirmModal
        open={confirmRejectOpen}
        title="Rechazar solicitud"
        message="¿Rechazar la solicitud de este transportista solo en este tramo? Recibirá un aviso con enlace a la oferta de ruta publicada."
        confirmLabel="Sí, rechazar"
        cancelLabel="Cancelar"
        confirmBusy={rejectBusy}
        onCancel={() => {
          if (!rejectBusy) setConfirmRejectOpen(false);
        }}
        onConfirm={() => void confirmRejectSubscriber()}
      />

      {expelOpen ? (
        <div
          className="vt-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={expelTitleId}
          onMouseDown={(e) => onBackdropPointerClose(e, expelBusy ? () => {} : () => setExpelOpen(false))}
        >
          <div className={modalShellWide} onMouseDown={(e) => e.stopPropagation()}>
            <div className="vt-modal-title" id={expelTitleId}>
              Expulsar transportista
            </div>
            <div className={modalSub}>
              Indicá el motivo. El transportista queda retirado de todos los tramos; la tienda puede recibir un
              ajuste de confianza en la demo.
            </div>
            <label className="mb-1 mt-2 block text-[11px] font-extrabold text-[var(--text)]" htmlFor="expel-reason-ta">
              Motivo (obligatorio)
            </label>
            <textarea
              id="expel-reason-ta"
              className="vt-input min-h-[88px] w-full resize-y"
              value={expelReason}
              onChange={(e) => setExpelReason(e.target.value)}
              disabled={expelBusy}
              placeholder="Ej.: incumplimiento de plazos, conducta inadecuada…"
            />
            <div className="vt-modal-actions">
              <button
                type="button"
                className="vt-btn"
                onClick={() => setExpelOpen(false)}
                disabled={expelBusy}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="vt-btn vt-btn-primary"
                onClick={() => void confirmExpelSubscriber()}
                disabled={expelBusy}
              >
                Confirmar expulsión
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
