import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import toast from "react-hot-toast";
import type { RouteOfferPublicState } from "../../../app/store/marketStoreTypes";
import { ConfirmModal } from "../../../components/ConfirmModal";
import { cn } from "../../../lib/cn";
import {
  fetchThreadRouteTramoSubscriptions,
  postAcceptRouteTramoSubscriptions,
  postRejectRouteTramoSubscriptions,
} from "../../../utils/chat/chatApi";
import { subscribeRouteTramoSubscriptionsChanged } from "../../../utils/chat/chatRealtime";
import {
  collectRouteOfferSubscribersForSheet,
  groupSubscribersByTramo,
  subscribersFromApiRouteTramoItems,
  type RouteOfferSubscriberSummary,
} from "../domain/routeOfferSubscribers";
import { railItemClass } from "./rail/chatRailStyles";

type Props = {
  threadId: string;
  routeOffer: RouteOfferPublicState | undefined;
  routeSheetId: string;
  routeSheetTitle?: string;
  /** Solo vendedor del hilo: aceptar o rechazar suscripciones en servidor. */
  canSellerManageRouteSubscriptions?: boolean;
  onSubscriptionsChanged?: () => void | Promise<void>;
  onClose: () => void;
  /** Desde notificación: abrir detalle y resaltar. */
  highlightUserId?: string | null;
};

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
  routeSheetId,
  routeSheetTitle,
  canSellerManageRouteSubscriptions = false,
  onSubscriptionsChanged,
  onClose,
  highlightUserId,
}: Props) {
  const [focusTramoId, setFocusTramoId] = useState<string | null>(null);
  const [focusCarrierId, setFocusCarrierId] = useState<string | null>(null);
  const autoOpenedForHi = useRef<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [subsLoadState, setSubsLoadState] = useState<"loading" | "ok" | "error">("loading");
  const [serverSubs, setServerSubs] = useState<RouteOfferSubscriberSummary[]>([]);
  const [confirmAcceptOpen, setConfirmAcceptOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [acceptBusy, setAcceptBusy] = useState(false);
  const [rejectBusy, setRejectBusy] = useState(false);

  const reloadSubscriptions = () => {
    const tid = threadId?.trim();
    if (!tid) return;
    setSubsLoadState("loading");
    void fetchThreadRouteTramoSubscriptions(tid)
      .then((items) => {
        setServerSubs(subscribersFromApiRouteTramoItems(items, routeSheetId));
        setSubsLoadState("ok");
      })
      .catch(() => {
        setServerSubs([]);
        setSubsLoadState("error");
      });
  };

  useEffect(() => {
    let cancelled = false;
    setSubsLoadState("loading");
    setServerSubs([]);
    const tid = threadId?.trim();
    if (!tid) {
      setSubsLoadState("error");
      return () => {
        cancelled = true;
      };
    }
    void fetchThreadRouteTramoSubscriptions(tid)
      .then((items) => {
        if (cancelled) return;
        setServerSubs(subscribersFromApiRouteTramoItems(items, routeSheetId));
        setSubsLoadState("ok");
      })
      .catch(() => {
        if (cancelled) return;
        setServerSubs([]);
        setSubsLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, routeSheetId]);

  useEffect(() => {
    const tid = threadId.trim();
    const rsid = routeSheetId.trim();
    if (tid.length < 4 || rsid.length < 1) return () => {};

    const unsub = subscribeRouteTramoSubscriptionsChanged((p) => {
      if (p.threadId !== tid || p.routeSheetId !== rsid) return;
      const next = subscribersFromApiRouteTramoItems(p.items, rsid);
      setServerSubs(next);
      setSubsLoadState("ok");
      const groups = groupSubscribersByTramo(next);
      setFocusTramoId((prevT) => {
        if (!prevT) return null;
        return groups.some((g) => g.stopId === prevT) ? prevT : null;
      });
      const ch = p.change.toLowerCase();
      if (ch === "accept" || ch === "reject") {
        void onSubscriptionsChanged?.();
      }
    });
    return unsub;
  }, [threadId, routeSheetId, onSubscriptionsChanged]);

  const subscribers = useMemo(() => {
    const local = collectRouteOfferSubscribersForSheet(routeOffer, routeSheetId);
    if (subsLoadState === "error") return local;
    if (subsLoadState === "loading") return [];
    if (serverSubs.length > 0) return serverSubs;
    return local;
  }, [subsLoadState, serverSubs, routeOffer, routeSheetId]);

  const tramoGroups = useMemo(() => groupSubscribersByTramo(subscribers), [subscribers]);

  const selectedTramo = focusTramoId
    ? (tramoGroups.find((g) => g.stopId === focusTramoId) ?? null)
    : null;
  const selectedCarrier =
    selectedTramo && focusCarrierId
      ? (selectedTramo.carriers.find((c) => c.userId === focusCarrierId) ?? null)
      : null;

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
    const g = tramoGroups.find((gr) => gr.carriers.some((c) => c.userId === hi));
    if (!g) return;
    autoOpenedForHi.current = hi;
    setFocusTramoId(g.stopId);
    setFocusCarrierId(hi);
    requestAnimationFrame(() => {
      rowRefs.current[hi]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [hi, tramoGroups]);

  const showHighlightRing = hi.length > 0 && selectedCarrier?.userId === hi;

  const selectedServiceHref = selectedCarrier ? serviceHrefForSubscriber(selectedCarrier) : null;

  const tramoRowForSelection = selectedCarrier?.tramos.find((t) => t.stopId === focusTramoId);

  const anotherConfirmedOnThisStop = useMemo(() => {
    if (!focusTramoId || !focusCarrierId) return false;
    return subscribers.some(
      (sub) =>
        sub.userId !== focusCarrierId &&
        sub.tramos.some((t) => t.stopId === focusTramoId && t.status === "confirmed"),
    );
  }, [subscribers, focusTramoId, focusCarrierId]);

  const selectedHasPending = tramoRowForSelection?.status === "pending";
  const selectedHasAcceptablePending = !!selectedHasPending && !anotherConfirmedOnThisStop;

  async function confirmAcceptSubscriber() {
    if (!selectedCarrier || !canSellerManageRouteSubscriptions || !focusTramoId) return;
    const tid = threadId.trim();
    const rsid = routeSheetId.trim();
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

  async function confirmRejectSubscriber() {
    if (!selectedCarrier || !canSellerManageRouteSubscriptions || !focusTramoId) return;
    const tid = threadId.trim();
    const rsid = routeSheetId.trim();
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
    return "Suscriptores por tramo";
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
        aria-label="Suscriptores a la oferta de hoja de ruta por tramo"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--border)] px-3 py-2.5">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
              Oferta publicada
            </div>
            <div className="mt-0.5 truncate text-[13px] font-extrabold leading-tight text-[var(--text)]">
              {headerTitle()}
            </div>
            {routeSheetTitle && !selectedTramo ? (
              <p className="vt-muted mb-0 mt-1 line-clamp-2 text-[11px] leading-snug">{routeSheetTitle}</p>
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
          {selectedCarrier && focusTramoId ? (
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
                          const tr = sub.tramos.find((t) => t.stopId === selectedTramo.stopId);
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
          ) : tramoGroups.length === 0 ? (
            <p className="vt-muted px-1 py-2 text-[12px] leading-snug">
              Todavía no hay transportistas suscritos a esta hoja en la oferta pública.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {tramoGroups.map((g) => (
                <li key={g.stopId}>
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
    </>
  );
}
