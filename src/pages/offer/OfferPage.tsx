import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../../lib/cn";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";
import { ImageLightbox } from "../chat/components/media/ImageLightbox";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { RouteOfferPreview } from "./RouteOfferPreview";
import { OfferSaveButton } from "./OfferSaveButton";
import { OfferCommentsSection } from "./OfferCommentsSection";
import {
  confirmedStopIdsForCarrier,
  tramoNotifyLineFromOffer,
} from "../chat/domain/routeSheetOfferGuards";
import {
  listUserTransportServices,
  userActsAsCarrierOnTransportOffer,
  userHasTransportService,
} from "../../utils/user/transportEligibility";
import { buildEmergentMapLegs } from "../../utils/map/emergentRouteMapLegs";
import { EmergentRouteFeedMap } from "../home/EmergentRouteFeedMap";
import {
  isToolPlaceholderUrl,
  TOOL_PLACEHOLDER_SRC,
} from "../../utils/market/toolPlaceholder";
import { trackRecommendationInteraction } from "../../utils/recommendations/recommendationsApi";
import {
  joinOfferChannel,
  leaveOfferChannel,
} from "../../utils/chat/chatRealtime";
import { offerFromStoreCatalogs } from "../../utils/market/offerFromCatalog";
import { fetchPublicOfferCard } from "../../utils/market/marketPersistence";
import { toggleOfferLike } from "../../utils/market/offerEngagementApi";
import { getSessionToken } from "../../utils/http/sessionToken";
import {
  isOfferPublishedForBuyerChat,
  NOT_PUBLISHED_TOAST_ES,
} from "../../utils/market/offerPublishedForBuyerChat";

function Trust({ score, helper }: { score: number; helper: string }) {
  return (
    <span
      className="rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2.5 py-1.5 text-xs text-[var(--muted)]"
      title={helper}
    >
      Confianza: <b>{score}</b>
    </span>
  );
}

export function OfferPage() {
  const { offerId } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const sessionReady = isSessionActive || !!getSessionToken();
  const offer = useMarketStore((s) =>
    offerId ? s.offers[offerId] : undefined,
  );
  const stores = useMarketStore((s) => s.stores);
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  const [publicCardLoadDone, setPublicCardLoadDone] = useState(() => {
    if (!offerId) return true;
    const st = useMarketStore.getState();
    if (st.offers[offerId]) return true;
    if (offerFromStoreCatalogs(offerId, st.storeCatalogs)) return true;
    return false;
  });

  const offerFromCatalog = useMemo(
    () =>
      offerId ? offerFromStoreCatalogs(offerId, storeCatalogs) : undefined,
    [offerId, storeCatalogs],
  );
  const resolvedOffer = offer ?? offerFromCatalog;

  const threadCatalogId = useMemo(
    () =>
      (offer?.emergentBaseOfferId?.trim() ??
        offerFromCatalog?.emergentBaseOfferId?.trim() ??
        offerId) as string | undefined,
    [offer, offerFromCatalog, offerId],
  );
  const routeOffer = useMarketStore((s) =>
    threadCatalogId ? s.routeOfferPublic[threadCatalogId] : undefined,
  );
  const threads = useMarketStore((s) => s.threads);
  const subscribeRouteOfferTramo = useMarketStore(
    (s) => s.subscribeRouteOfferTramo,
  );
  const validateRouteOfferTramo = useMarketStore(
    (s) => s.validateRouteOfferTramo,
  );
  const submitOfferQuestion = useMarketStore((s) => s.submitOfferQuestion);
  const ensureThreadForOffer = useMarketStore((s) => s.ensureThreadForOffer);
  const refreshOfferQaFromServer = useMarketStore(
    (s) => s.refreshOfferQaFromServer,
  );
  /** Sin esto, cada `refreshOfferQaFromServer` sustituye `offers[id]` y `resolvedOffer` cambia de referencia → efectos con `[resolvedOffer]` reejecutan en bucle. */
  const offerResolved = Boolean(resolvedOffer);

  useLayoutEffect(() => {
    if (!offerId || offer || !offerFromCatalog) return;
    useMarketStore.setState((s) => {
      if (s.offers[offerId]) return s;
      return {
        ...s,
        offers: { ...s.offers, [offerId]: offerFromCatalog },
      };
    });
  }, [offerId, offer, offerFromCatalog]);

  useEffect(() => {
    if (!offerId) {
      setPublicCardLoadDone(false);
      return;
    }
    if (offer || offerFromCatalog) {
      setPublicCardLoadDone(true);
      return;
    }
    setPublicCardLoadDone(false);
    void fetchPublicOfferCard(offerId)
      .then((r) => {
        if (r) {
          const storeKey = r.store.id?.trim() || r.offer.storeId;
          useMarketStore.setState((s) => {
            const nextStores = { ...s.stores };
            if (storeKey) {
              nextStores[storeKey] = {
                ...s.stores[storeKey],
                ...r.store,
                id: storeKey,
              };
            }
            return {
              ...s,
              offers: { ...s.offers, [r.offer.id]: r.offer },
              stores: nextStores,
            };
          });
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "No se pudo cargar la ficha.";
        toast.error(msg);
      })
      .finally(() => {
        setPublicCardLoadDone(true);
      });
  }, [offerId, offer, offerFromCatalog]);

  const openTramos = useMemo(
    () => routeOffer?.tramos.filter((t) => !t.assignment) ?? [],
    [routeOffer],
  );
  const [pickedStopId, setPickedStopId] = useState<string | null>(null);
  const [galleryLightboxUrl, setGalleryLightboxUrl] = useState<string | null>(
    null,
  );
  const [selectedTransportServiceId, setSelectedTransportServiceId] = useState<
    string | null
  >(null);
  const chosenStopId = pickedStopId ?? openTramos[0]?.stopId ?? "";

  const pendingValidations = useMemo(
    () =>
      routeOffer?.tramos.filter((t) => t.assignment?.status === "pending") ??
      [],
    [routeOffer],
  );

  const carrierConfirmedOnRoute = useMemo(
    () =>
      !!routeOffer?.tramos.some(
        (t) =>
          t.assignment?.userId === me.id && t.assignment.status === "confirmed",
      ),
    [routeOffer, me.id],
  );

  const carrierPendingOnRoute = useMemo(
    () =>
      !!routeOffer?.tramos.some(
        (t) =>
          t.assignment?.userId === me.id && t.assignment.status === "pending",
      ),
    [routeOffer, me.id],
  );

  const threadForThisOffer = useMemo(
    () =>
      offerId
        ? Object.values(threads).find(
            (t) => t.offerId === (threadCatalogId ?? offerId),
          )
        : undefined,
    [threads, offerId, threadCatalogId],
  );
  const carrierInChatThread = useMemo(
    () => !!threadForThisOffer?.chatCarriers?.some((c) => c.id === me.id),
    [threadForThisOffer, me.id],
  );
  const canOpenRouteChat = carrierConfirmedOnRoute || carrierInChatThread;

  const actingAsCarrierOnThisOffer =
    resolvedOffer &&
    userActsAsCarrierOnTransportOffer(
      me.id,
      stores,
      storeCatalogs,
      resolvedOffer,
      !!routeOffer,
    );

  const emergentMapLegs = useMemo(
    () =>
      resolvedOffer ? buildEmergentMapLegs(resolvedOffer, routeOffer) : [],
    [resolvedOffer, routeOffer],
  );
  const transportServiceOptions = useMemo(
    () => listUserTransportServices(me.id, stores, storeCatalogs),
    [me.id, stores, storeCatalogs],
  );

  useEffect(() => {
    if (transportServiceOptions.length === 0) {
      setSelectedTransportServiceId(null);
      return;
    }
    setSelectedTransportServiceId((prev) => {
      if (prev && transportServiceOptions.some((o) => o.serviceId === prev))
        return prev;
      return transportServiceOptions[0]!.serviceId;
    });
  }, [transportServiceOptions]);

  const prevCarrierStopsOfferRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!routeOffer || !actingAsCarrierOnThisOffer) {
      prevCarrierStopsOfferRef.current = null;
      return;
    }
    const now = confirmedStopIdsForCarrier(routeOffer, me.id);
    const prev = prevCarrierStopsOfferRef.current;
    prevCarrierStopsOfferRef.current = now;
    if (prev === null) return;
    for (const sid of now) {
      if (!prev.has(sid)) {
        toast.success(
          `Te asignaron a ${tramoNotifyLineFromOffer(routeOffer, sid)}. Podés abrir el chat de la operación.`,
        );
      }
    }
  }, [routeOffer, me.id, actingAsCarrierOnThisOffer]);

  const galleryUrls = useMemo(() => {
    if (!resolvedOffer) return [];
    const main =
      resolvedOffer.imageUrl?.trim() ||
      (resolvedOffer.tags.includes("Servicio") ? TOOL_PLACEHOLDER_SRC : "");
    const rest = (resolvedOffer.imageUrls ?? [])
      .map((u) => String(u).trim())
      .filter(Boolean);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of [main, ...rest]) {
      if (!u || seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
    return out;
  }, [resolvedOffer]);

  const heroImageSrc = useMemo(() => {
    if (!resolvedOffer) return "";
    return (
      galleryUrls[0] ||
      resolvedOffer.imageUrl?.trim() ||
      (resolvedOffer.tags.includes("Servicio") ? TOOL_PLACEHOLDER_SRC : "")
    );
  }, [resolvedOffer, galleryUrls]);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    void trackRecommendationInteraction(offerId, "click").catch(() => undefined);
  }, [offerId, offerResolved]);

  /** Evita repetir scrollIntoView cuando `resolvedOffer`/QA se actualiza (polling o SignalR): obligaba a bajar si el usuario intentaba subir. */
  const offerCommentsAnchorScrolledKeyRef = useRef<string | null>(null);
  const hojaSuscribirScrolledKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    if (location.hash !== "#hoja-suscribir") {
      hojaSuscribirScrolledKeyRef.current = null;
      return;
    }
    const el = document.getElementById("hoja-suscribir");
    if (!el) return;
    const key = `${offerId}|${location.pathname}|#hoja-suscribir`;
    if (hojaSuscribirScrolledKeyRef.current === key) return;
    hojaSuscribirScrolledKeyRef.current = key;
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [offerId, offerResolved, location.hash, location.pathname, resolvedOffer]);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    if (location.hash !== "#offer-comments") {
      offerCommentsAnchorScrolledKeyRef.current = null;
      return;
    }
    const el = document.getElementById("offer-comments");
    if (!el) return;

    const key = `${offerId}|${location.pathname}|#offer-comments`;
    if (offerCommentsAnchorScrolledKeyRef.current === key) return;
    offerCommentsAnchorScrolledKeyRef.current = key;

    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [offerId, offerResolved, location.hash, location.pathname]);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    void refreshOfferQaFromServer(offerId);
  }, [offerId, offerResolved, refreshOfferQaFromServer]);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    if (!isSessionActive || me.id === "guest") return;
    void joinOfferChannel(offerId);
    return () => {
      void leaveOfferChannel(offerId);
    };
  }, [offerId, offerResolved, isSessionActive, me.id]);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        void refreshOfferQaFromServer(offerId);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [offerId, offerResolved, refreshOfferQaFromServer]);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    if (me.id !== "guest") return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshOfferQaFromServer(offerId);
      }
    }, 15000);
    return () => clearInterval(t);
  }, [offerId, offerResolved, me.id, refreshOfferQaFromServer]);

  if (!offerId || !publicCardLoadDone) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad text-[15px] text-[var(--muted)]">
          Cargando ficha…
        </div>
      </div>
    );
  }

  if (!resolvedOffer) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Oferta no encontrada.</div>
      </div>
    );
  }

  const store = stores[resolvedOffer.storeId];
  if (!store) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Oferta no encontrada.</div>
      </div>
    );
  }

  const heroIsToolPlaceholder = isToolPlaceholderUrl(heroImageSrc);
  const isEmergentRouteFicha = !!resolvedOffer.isEmergentRoutePublication;

  const isOwnOffer =
    !!store?.ownerUserId && me.id !== "guest" && me.id === store.ownerUserId;

  return (
    <div className="container vt-page">
      <div className="flex flex-col gap-3.5">
        <div className="vt-card relative overflow-hidden">
          {!isEmergentRouteFicha ? (
            <div className="pointer-events-none absolute left-3 right-3 top-3 z-[2] flex items-center justify-between gap-2">
              <button
                type="button"
                className="pointer-events-auto vt-btn border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.72)] shadow-[0_10px_25px_rgba(2,6,23,0.18)] backdrop-blur-[10px] hover:bg-[rgba(255,255,255,0.86)]"
                onClick={() => nav(-1)}
              >
                <ArrowLeft size={16} />
              </button>
              <OfferSaveButton
                offerId={offerId ?? ""}
                className="pointer-events-auto border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.72)] shadow-[0_10px_25px_rgba(2,6,23,0.18)] backdrop-blur-[10px] hover:bg-[rgba(255,255,255,0.86)]"
              />
            </div>
          ) : null}
          {isEmergentRouteFicha ? (
            <div className="flex h-[260px] w-full flex-col overflow-hidden bg-[#e2e8f0]">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/90 bg-[#eef2f7] px-2.5 py-2">
                <span className="text-sm font-black tracking-wide text-slate-800">
                  Hoja de ruta
                </span>
                {offerId && emergentMapLegs.length > 0 ? (
                  <Link
                    to={`/offer/${encodeURIComponent(offerId)}/mapa`}
                    className="shrink-0 text-xs font-extrabold text-blue-600 underline"
                  >
                    Ver mapa en grande
                  </Link>
                ) : null}
              </div>
              <div className="relative min-h-0 flex-1">
                <div className="pointer-events-none absolute left-2 right-2 top-2 z-[1100] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="pointer-events-auto vt-btn border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.92)] shadow-[0_6px_16px_rgba(2,6,23,0.15)] backdrop-blur-[6px] hover:bg-[rgba(255,255,255,0.98)]"
                    onClick={() => nav(-1)}
                    aria-label="Volver"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <OfferSaveButton
                    offerId={offerId ?? ""}
                    className="pointer-events-auto border-[rgba(255,255,255,0.45)] bg-[rgba(255,255,255,0.92)] shadow-[0_6px_16px_rgba(2,6,23,0.15)] backdrop-blur-[6px] hover:bg-[rgba(255,255,255,0.98)]"
                  />
                </div>
                <EmergentRouteFeedMap
                  legs={emergentMapLegs}
                  mapKey={`offer-map-${resolvedOffer.id}`}
                  className="absolute inset-0 h-full w-full min-h-0 [&_.leaflet-control-attribution]:text-[8px] [&_.leaflet-container]:z-0"
                />
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "relative",
                heroIsToolPlaceholder && "bg-gray-200",
              )}
            >
              <ProtectedMediaImg
                src={heroImageSrc}
                alt={resolvedOffer.title}
                wrapperClassName="block h-[260px] w-full"
                className={cn(
                  "block h-[260px] w-full",
                  heroIsToolPlaceholder
                    ? "vt-img-tool-placeholder p-5 sm:p-7"
                    : "object-cover",
                )}
              />
              {heroImageSrc && !heroIsToolPlaceholder ? (
                <button
                  type="button"
                  className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
                  aria-label="Ver imagen a pantalla completa"
                  title="Ver imagen a pantalla completa"
                  onClick={() => setGalleryLightboxUrl(heroImageSrc)}
                />
              ) : null}
            </div>
          )}
          {!isEmergentRouteFicha && galleryUrls.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] px-3 py-2.5">
              {galleryUrls.slice(1).map((src, i) => {
                const thumbIsTool = isToolPlaceholderUrl(src);
                return (
                  <div
                    key={`${src}-${i}`}
                    className={cn(
                      "relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-[var(--border)]",
                      thumbIsTool && "bg-gray-200",
                    )}
                  >
                    <ProtectedMediaImg
                      src={src}
                      alt=""
                      wrapperClassName="h-[72px] w-[72px]"
                      className={cn(
                        "h-[72px] w-[72px]",
                        thumbIsTool
                          ? "vt-img-tool-placeholder p-1.5"
                          : "object-cover",
                      )}
                    />
                    {!thumbIsTool ? (
                      <button
                        type="button"
                        className="absolute inset-0 z-[1] cursor-zoom-in bg-transparent"
                        aria-label="Ver imagen a pantalla completa"
                        title="Ver imagen a pantalla completa"
                        onClick={() => setGalleryLightboxUrl(src)}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="text-[22px] font-black tracking-[-0.03em]">
                  {resolvedOffer.title}
                </div>
              </div>
              <div className="shrink-0 text-lg font-black">
                {resolvedOffer.price}
              </div>
            </div>
            {isEmergentRouteFicha ?
              (() => {
                const legs = resolvedOffer.emergentRouteParadas
                const anyPerLeg = legs?.some((l) => l.monedaPago?.trim())
                if (anyPerLeg && legs?.length) {
                  return (
                    <div className="m-0 text-sm font-extrabold text-[var(--muted)]">
                      <span className="block text-[11px] uppercase tracking-wide">
                        Moneda por tramo
                      </span>
                      <ul className="mt-1 list-none space-y-0.5 p-0 text-[var(--text)]">
                        {legs.map((leg, i) => {
                          const m = leg.monedaPago?.trim()
                          if (!m) return null
                          const label = String.fromCharCode(65 + Math.min(25, i))
                          return (
                            <li key={i}>
                              Tramo {label}: {m}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                }
                if (resolvedOffer.emergentMonedaPago?.trim()) {
                  return (
                    <p className="m-0 text-sm font-extrabold text-[var(--muted)]">
                      Moneda de pago:{" "}
                      <span className="text-[var(--text)]">
                        {resolvedOffer.emergentMonedaPago.trim()}
                      </span>
                    </p>
                  )
                }
                return null
              })()
            : null}

            <div className="flex flex-wrap items-center gap-2">
              {sessionReady && me.id !== "guest" ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-3 py-1.5 text-sm font-extrabold text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--muted)_10%,var(--surface))]"
                  title={
                    resolvedOffer.viewerLikedOffer
                      ? "Quitar me gusta"
                      : "Me gusta"
                  }
                  onClick={() => {
                    if (!offerId) return;
                    void (async () => {
                      try {
                        const r = await toggleOfferLike(offerId);
                        useMarketStore.setState((s) => {
                          const prev = s.offers[offerId];
                          if (!prev) return s;
                          return {
                            ...s,
                            offers: {
                              ...s.offers,
                              [offerId]: {
                                ...prev,
                                offerLikeCount: r.likeCount,
                                viewerLikedOffer: r.liked,
                              },
                            },
                          };
                        });
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "No se pudo guardar el me gusta.",
                        );
                      }
                    })();
                  }}
                >
                  <Heart
                    size={18}
                    className={cn(
                      resolvedOffer.viewerLikedOffer &&
                        "fill-[color-mix(in_oklab,var(--bad)_50%,#f43f5e)] text-[color-mix(in_oklab,var(--bad)_50%,#f43f5e)]",
                    )}
                    aria-hidden
                  />
                  <span className="tabular-nums">
                    {resolvedOffer.offerLikeCount ?? 0}
                  </span>
                </button>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--muted)]"
                  title="Iniciá sesión para dar me gusta a la ficha"
                >
                  <Heart size={18} aria-hidden />
                  <span className="tabular-nums">
                    {resolvedOffer.offerLikeCount ?? 0}
                  </span>
                </span>
              )}
            </div>

            {resolvedOffer.description?.trim() && !isEmergentRouteFicha ? (
              <p className="text-[15px] leading-relaxed text-[var(--text)]">
                {resolvedOffer.description.trim()}
              </p>
            ) : null}

            <div className="vt-row flex-wrap justify-between">
              <Link
                to={`/store/${store.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2.5 py-1.5 text-xs font-extrabold text-[var(--text)]"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                {store.name}
                {store.verified ? (
                  <span className="ml-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--good)_12%,transparent)] px-2 py-1 text-[11px] font-black text-[color-mix(in_oklab,var(--good)_85%,var(--text))]">
                    Verificado
                  </span>
                ) : (
                  <span className="ml-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bad)_10%,transparent)] px-2 py-1 text-[11px] font-black text-[color-mix(in_oklab,var(--bad)_80%,var(--text))]">
                    No verificado
                  </span>
                )}
              </Link>
              <Trust
                score={store.trustScore}
                helper="Indicador de confianza. A mayor número, mayor reputación."
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {resolvedOffer.tags.map((t) => (
                <span key={t} className="vt-pill">
                  {t}
                </span>
              ))}
            </div>

            {resolvedOffer.isEmergentRoutePublication &&
            resolvedOffer.emergentBaseOfferId ? (
              <div>
                <Link
                  to={`/offer/${resolvedOffer.emergentBaseOfferId}`}
                  className="inline-flex text-[15px] font-extrabold text-[var(--primary)] hover:underline"
                >
                  Ver ficha del producto o servicio
                </Link>
              </div>
            ) : null}

            {routeOffer ? (
              <div id="hoja-suscribir" className="scroll-mt-20 space-y-0">
                <RouteOfferPreview
                  state={routeOffer}
                  className="mt-1"
                  showTramoAddresses={!isEmergentRouteFicha}
                />
                {actingAsCarrierOnThisOffer ? (
                  <div className="mt-3 rounded-[14px] border border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] p-3.5"
                  >
                    <div className="text-sm font-black tracking-tight">
                      Suscribirme a un tramo
                    </div>
                    <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                      Elegí un tramo libre y enviá la solicitud. Podés
                      suscribirte a <strong>más de un tramo</strong> en la misma
                      hoja; cada uno se valida por separado. El vendedor y el
                      comprador deben <strong>validar</strong> la suscripción
                      antes de que puedas entrar al chat operativo de la ruta.
                    </p>
                    {transportServiceOptions.length > 1 ? (
                      <div className="mt-2">
                        <label
                          className="block text-[12px] font-extrabold text-[var(--text)]"
                          htmlFor="tr-svc-suscribe"
                        >
                          Servicio de transporte para la suscripción
                        </label>
                        <select
                          id="tr-svc-suscribe"
                          className="mt-1 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[13px] font-semibold"
                          value={selectedTransportServiceId ?? ""}
                          onChange={(e) =>
                            setSelectedTransportServiceId(
                              e.target.value || null,
                            )
                          }
                        >
                          {transportServiceOptions.map((o) => (
                            <option key={o.serviceId} value={o.serviceId}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    {carrierPendingOnRoute ? (
                      <p className="mt-2 rounded-lg border border-[color-mix(in_oklab,#d97706_35%,var(--border))] bg-[color-mix(in_oklab,#d97706_8%,var(--surface))] px-2.5 py-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
                        Tenés al menos una solicitud pendiente de validación.
                        Mientras tanto podés pedir otro tramo si sigue libre;
                        cuando te acepten en cualquiera de ellos podés habilitar
                        el chat (según reglas de la demo).
                      </p>
                    ) : null}
                    {carrierConfirmedOnRoute ? (
                      <p className="mt-2 rounded-lg border border-[color-mix(in_oklab,var(--good)_30%,var(--border))] bg-[color-mix(in_oklab,var(--good)_7%,var(--surface))] px-2.5 py-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
                        Suscripción confirmada: ya podés abrir el chat de la
                        operación.
                      </p>
                    ) : null}
                    {openTramos.length === 0 ? (
                      <p className="mt-2 text-[13px] font-semibold text-[var(--text)]">
                        Todos los tramos tienen transportista asignado o
                        pendiente.
                      </p>
                    ) : (
                      <div className="mt-2 flex flex-col gap-2">
                        {openTramos.map((t) => (
                          <label
                            key={t.stopId}
                            className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-2.5"
                          >
                            <input
                              type="radio"
                              name="tramo-pick"
                              className="mt-1"
                              checked={chosenStopId === t.stopId}
                              onChange={() => setPickedStopId(t.stopId)}
                            />
                            <span className="text-[13px] leading-snug">
                              <strong>Tramo {t.orden}</strong>
                              {isEmergentRouteFicha
                                ? null
                                : (
                                    <>
                                      : {t.origenLine} → {t.destinoLine}
                                    </>
                                  )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="vt-btn vt-btn-primary"
                          disabled={!chosenStopId || openTramos.length === 0}
                          onClick={() => {
                            if (!threadCatalogId || !chosenStopId) return;
                            if (
                              transportServiceOptions.length > 0 &&
                              !selectedTransportServiceId
                            ) {
                              toast.error(
                                "Elegí con qué servicio de transporte te suscribís.",
                              );
                              return;
                            }
                            const vLabel = selectedTransportServiceId
                              ? transportServiceOptions.find(
                                  (o) => o.serviceId === selectedTransportServiceId,
                                )?.label
                              : undefined;
                            const ok = subscribeRouteOfferTramo(
                              threadCatalogId,
                              chosenStopId,
                              {
                                userId: me.id,
                                displayName: me.name,
                                phone: me.phone,
                                trustScore: me.trustScore,
                              },
                              vLabel,
                            );
                            if (ok) {
                              toast.success(
                                "Solicitud enviada. Pendiente de validación del vendedor o comprador.",
                              );
                              setPickedStopId(null);
                            } else {
                              toast.error("No se pudo suscribir a ese tramo.");
                            }
                          }}
                        >
                          Enviar solicitud de suscripción
                        </button>
                        <button
                          type="button"
                          className="vt-btn"
                          disabled={!canOpenRouteChat}
                          title={
                            canOpenRouteChat
                              ? "Abrir el chat de la operación"
                              : "Disponible con tramo validado o si ya figurás como integrante del hilo"
                          }
                          onClick={() => {
                            if (!canOpenRouteChat) {
                              toast.error(
                                "El chat se habilita con tramo validado o cuando ya sos integrante del hilo de esta oferta.",
                              );
                              return;
                            }
                            if (
                              !isOfferPublishedForBuyerChat(
                                resolvedOffer,
                                storeCatalogs,
                              )
                            ) {
                              toast.error(NOT_PUBLISHED_TOAST_ES);
                              return;
                            }
                            void trackRecommendationInteraction(
                              resolvedOffer.id,
                              "chat_start",
                            ).catch(() => undefined);
                            void (async () => {
                              const threadId = await ensureThreadForOffer(resolvedOffer.id, {
                                buyerId: me.id,
                              });
                              if (!threadId) {
                                toast.error(
                                  "Aún no hay conversación con un comprador. Se abrirá cuando alguien te escriba.",
                                );
                                return;
                              }
                              nav(`/chat/${threadId}`);
                            })();
                          }}
                        >
                          Ir al chat de la operación
                        </button>
                      </div>
                      {!canOpenRouteChat ? (
                        <p className="text-[12px] leading-snug text-[var(--muted)]">
                          El botón de chat permanece deshabilitado hasta que tu
                          tramo quede <strong>validado</strong> o hasta que
                          figures en el hilo como transportista.
                        </p>
                      ) : null}
                      {canOpenRouteChat &&
                      !carrierConfirmedOnRoute &&
                      carrierInChatThread ? (
                        <p className="text-[12px] leading-snug text-[var(--muted)]">
                          Abrís el chat como integrante del hilo aunque no
                          tengas un tramo confirmado en este momento (demo).
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {pendingValidations.length > 0 ? (
                  <div className="mt-3 rounded-[14px] border border-[color-mix(in_oklab,var(--border)_90%,transparent)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] p-3.5">
                    <div className="text-sm font-black">
                      Validación vendedor / comprador (demo)
                    </div>
                    <p className="vt-muted mt-1 text-[12px] leading-snug">
                      En producción solo el vendedor del chat y el comprador
                      podrían aceptar o rechazar. Aquí podés simular la decisión
                      para ver el flujo completo.
                    </p>
                    <ul className="m-0 mt-2 list-none space-y-2 p-0">
                      {pendingValidations.map((t) => (
                        <li
                          key={t.stopId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2"
                        >
                          <span className="text-[13px]">
                            Tramo {t.orden}: {t.assignment?.displayName}
                          </span>
                          <span className="flex gap-1.5">
                            <button
                              type="button"
                              className="vt-btn vt-btn-primary px-2.5 py-1.5 text-xs"
                              onClick={() => {
                                if (!threadCatalogId) return;
                                validateRouteOfferTramo(
                                  threadCatalogId,
                                  t.stopId,
                                  true,
                                );
                                toast.success("Suscripción validada.");
                              }}
                            >
                              Aceptar
                            </button>
                            <button
                              type="button"
                              className="vt-btn px-2.5 py-1.5 text-xs"
                              onClick={() => {
                                if (!threadCatalogId) return;
                                validateRouteOfferTramo(
                                  threadCatalogId,
                                  t.stopId,
                                  false,
                                );
                                toast("Solicitud rechazada");
                              }}
                            >
                              Rechazar
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2.5">
              {isEmergentRouteFicha ? (
                <button
                  type="button"
                  className="vt-btn vt-btn-primary min-[420px]:flex-1"
                  disabled={isOwnOffer}
                  title={
                    isOwnOffer
                      ? "No podés suscribirte a tu propia publicación."
                      : undefined
                  }
                  onClick={() => {
                    if (!isSessionActive || me.id === "guest") {
                      openAuthModal();
                      return;
                    }
                    if (isOwnOffer) {
                      toast.error("No podés suscribirte a tu propia oferta.");
                      return;
                    }
                    if (!userHasTransportService(me.id, stores, storeCatalogs)) {
                      toast.error(
                        "Necesitás un servicio de transporte publicado en tu tienda para suscribirte.",
                      );
                      return;
                    }
                    if (!routeOffer) {
                      toast.error(
                        "Aún no tenemos la hoja de ruta en esta sesión. Entrá desde el inicio o recargá la página.",
                      );
                      return;
                    }
                    document
                      .getElementById("hoja-suscribir")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Suscribirse
                </button>
              ) : (
                <button
                  type="button"
                  className="vt-btn vt-btn-primary min-[420px]:flex-1"
                  disabled={
                    (!!actingAsCarrierOnThisOffer && !!routeOffer) || isOwnOffer
                  }
                  title={
                    isOwnOffer
                      ? "No podés chatear con vos mismo en tu propia oferta."
                      : actingAsCarrierOnThisOffer && routeOffer
                        ? "Como transportista: suscribite a un tramo y esperá la validación para usar el chat de la ruta."
                        : undefined
                  }
                  onClick={() => {
                    if (!isSessionActive || me.id === "guest") {
                      openAuthModal();
                      return;
                    }
                    if (isOwnOffer) {
                      toast.error("No podés chatear con vos mismo.");
                      return;
                    }
                    if (actingAsCarrierOnThisOffer && routeOffer) {
                      toast.error(
                        "Usá la suscripción al tramo; el chat se habilita tras la validación.",
                      );
                      return;
                    }
                    if (
                      !isOfferPublishedForBuyerChat(
                        resolvedOffer,
                        storeCatalogs,
                      )
                    ) {
                      toast.error(NOT_PUBLISHED_TOAST_ES);
                      return;
                    }
                    void trackRecommendationInteraction(
                      resolvedOffer.id,
                      "chat_start",
                    ).catch(() => undefined);
                    void (async () => {
                      const threadId = await ensureThreadForOffer(
                        resolvedOffer.id,
                        { buyerId: me.id },
                      );
                      if (!threadId) {
                        toast.error("No se pudo abrir el chat. Probá de nuevo.");
                        return;
                      }
                      nav(`/chat/${threadId}`);
                    })();
                  }}
                >
                  <ShoppingCart size={16} /> Comprar (Chat)
                </button>
              )}
            </div>
          </div>
        </div>

        <OfferCommentsSection
          offer={resolvedOffer}
          store={store}
          me={me}
          isSessionActive={isSessionActive}
          isOwnOffer={isOwnOffer}
          submitOfferQuestion={submitOfferQuestion}
        />
      </div>

      <ImageLightbox
        url={galleryLightboxUrl}
        onClose={() => setGalleryLightboxUrl(null)}
      />
    </div>
  );
}
