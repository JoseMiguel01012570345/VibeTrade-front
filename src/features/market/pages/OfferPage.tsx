import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Heart, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@shared/lib/cn";
import {
  offerHeroChromeBtnClass,
  offerHeroSaveBtnChromeClass,
} from "@features/market/styles/storePageStyles";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { ImageLightbox } from "@shared/components/media/ImageLightbox";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { storeHref } from "@features/market/logic/store/storePath";
import { RouteTramoSubscribeModal } from "../components/RouteTramoSubscribeModal";
import { OfferSaveButton } from "../components/OfferSaveButton";
import { OfferCommentsSection } from "../components/OfferCommentsSection";
import {
  confirmedStopIdsForCarrier,
  ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES,
  routeOfferPublicBlockedForBuyerWithAgreement,
  tramoNotifyLineFromOffer,
} from "@features/chat/logic/route-sheet/routeSheetOfferGuards";
import {
  listUserTransportServices,
  userActsAsCarrierOnTransportOffer,
  userHasTransportService,
} from "@features/market/logic/transportEligibility";
import {
  isToolPlaceholderUrl,
  TOOL_PLACEHOLDER_SRC,
} from "@features/market/logic/toolPlaceholder";
import { trackRecommendationInteraction } from "@features/home/api/recommendationsApi";
import { useCartStore } from "@features/orders/logic/cartStore";
import { parseProductPriceNumber } from "@features/market/logic/parseProductPrice";
import { reportProductView } from "@features/analytics";
import {
  joinOfferChannel,
  leaveOfferChannel,
  subscribeRouteTramoSubscriptionsChanged,
} from "@features/chat/logic/realtime/chatRealtime";

import { fetchStoreDetail } from "@features/market/api/fetchStoreDetail";
import { mergeStoreCatalogWithLocalExtras } from "@features/market/logic/storeCatalogTypes";
import { toggleOfferLike } from "@features/market/api/offerEngagementApi";
import { emergentRoutePublicationUserDescription } from "@features/market/logic/emergentRouteOfferDisplay";
import {
  buildEmergentMapLegs,
  tramoMapSubrouteHint,
} from "@features/market/logic/map/emergentRouteMapLegs";
import { useLegKmForEmergentLegs } from "@features/market/hooks/useEmergentRouteLegKm";
import {
  formatKmEs,
  formatPrecioPorKmEs,
} from "@features/market/logic/map/routeLegMetrics";
import { getSessionToken } from "@shared/services/http/sessionToken";
import { EmergentRouteFeedMap } from "@features/home";
import {
  isOfferPublishedForBuyerChat,
  NOT_PUBLISHED_TOAST_ES,
} from "@features/market/logic/offerPublishedForBuyerChat";
import {
  fetchEmergentCarrierSubscriptionStatus,
  fetchEmergentMyRouteTramoSubscriptions,
  postEmergentTramoSubscriptionRequest,
} from "@features/market/api/emergentCarrierSubscriptionApi";
import { fetchThreadRouteTramoSubscriptions } from "@features/chat/api/chatApi";
import { OfferProductDetail } from "../components/OfferProductDetail";
import { StorefrontChrome } from "@features/storefront/components/StorefrontChrome";
import { useOfferPublicCard } from "../hooks/useOfferPublicCard";
import { useEmergentRouteTramoSubscriptionsQuery } from "../hooks/useEmergentRouteTramoSubscriptionsQuery";

/** Extrae un código de moneda (3 letras, p. ej. "USD") del texto de precio "$1.08 USD"; vacío si no hay. */
function currencyCodeFromPriceText(price: string): string {
  return /\b([A-Z]{3})\b/.exec(price ?? "")?.[1] ?? "";
}

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
  const stores = useMarketStore((s) => s.stores);
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);

  const {
    resolvedOffer,
    threadCatalogId,
    publicCardLoadDone,
  } = useOfferPublicCard(offerId, {
    revalidateEmergent: true,
    sessionReady,
    isGuest: me.id === "guest",
  });
  const routeOffer = useMarketStore((s) =>
    threadCatalogId ? s.routeOfferPublic[threadCatalogId] : undefined,
  );
  const threads = useMarketStore((s) => s.threads);
  const subscribeRouteOfferTramo = useMarketStore(
    (s) => s.subscribeRouteOfferTramo,
  );
  const applyThreadRouteTramoSubscriptions = useMarketStore(
    (s) => s.applyThreadRouteTramoSubscriptions,
  );
  const hydrateRouteOfferCarrierSubscriptions = useMarketStore(
    (s) => s.hydrateRouteOfferCarrierSubscriptions,
  );
  const submitOfferQuestion = useMarketStore((s) => s.submitOfferQuestion);
  const refreshOfferQaFromServer = useMarketStore(
    (s) => s.refreshOfferQaFromServer,
  );
  /** Sin esto, cada `refreshOfferQaFromServer` sustituye `offers[id]` y `resolvedOffer` cambia de referencia → efectos con `[resolvedOffer]` reejecutan en bucle. */
  const offerResolved = Boolean(resolvedOffer);

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

  const emergentPublicationId = useMemo(
    () => (resolvedOffer?.id?.startsWith("emo_") ? resolvedOffer.id : null),
    [resolvedOffer?.id],
  );

  const emergentSubsQuery = useEmergentRouteTramoSubscriptionsQuery(
    emergentPublicationId ?? undefined,
    {
      enabled:
        sessionReady &&
        me.id !== "guest" &&
        !!emergentPublicationId &&
        !!threadCatalogId &&
        !!routeOffer?.routeSheetId,
    },
  );

  const stopSummaryForModal = useMemo(() => {
    const t = routeOffer?.tramos.find((x) => x.stopId === chosenStopId);
    if (!t) return chosenStopId || "—";
    return `Tramo ${t.orden}`;
  }, [routeOffer, chosenStopId]);

  const [subscribeModalOpen, setSubscribeModalOpen] = useState(false);
  const [subscribeModalSubmitting, setSubscribeModalSubmitting] =
    useState(false);

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

  const threadForThisOffer = useMemo(() => {
    if (!offerId) return undefined;
    const catalog = (threadCatalogId ?? offerId).trim();
    const idHint = (
      routeOffer?.threadId?.trim() ||
      resolvedOffer?.emergentThreadId?.trim() ||
      ""
    ).trim();
    if (idHint.startsWith("cth_")) {
      const t = threads[idHint];
      if (t) return t;
    }
    return Object.values(threads).find((t) => t.offerId === catalog);
  }, [
    threads,
    offerId,
    threadCatalogId,
    routeOffer?.threadId,
    resolvedOffer?.emergentThreadId,
  ]);

  /** Persistencia servidor: recuperar suscripciones del transportista sin depender del hilo en memoria (p. ej. tras F5). */
  useEffect(() => {
    const items = emergentSubsQuery.data;
    if (!items?.length || !threadCatalogId) return;
    hydrateRouteOfferCarrierSubscriptions(threadCatalogId, items, me.id);
  }, [
    emergentSubsQuery.data,
    threadCatalogId,
    me.id,
    hydrateRouteOfferCarrierSubscriptions,
  ]);

  /** Rechazo/aceptación desde el vendedor: el transportista en <c>/offer/emo_*</c> no suele tener <c>JoinThread</c>; el grupo de oferta sí. */
  useEffect(() => {
    if (
      !emergentPublicationId ||
      !threadCatalogId ||
      me.id === "guest" ||
      !sessionReady
    )
      return;
    const emo = emergentPublicationId.trim();
    const tc = threadCatalogId.trim();
    const uid = me.id;
    const unsub = subscribeRouteTramoSubscriptionsChanged((p) => {
      const e = p.emergentOfferId?.trim();
      if (!e || e !== emo) return;
      void fetchEmergentMyRouteTramoSubscriptions(emo).then((items) => {
        if (items === null) return;
        hydrateRouteOfferCarrierSubscriptions(tc, items, uid);
      });
    });
    return unsub;
  }, [
    emergentPublicationId,
    threadCatalogId,
    me.id,
    sessionReady,
    hydrateRouteOfferCarrierSubscriptions,
  ]);

  useEffect(() => {
    const tid = (
      routeOffer?.threadId?.trim() ||
      resolvedOffer?.emergentThreadId?.trim() ||
      threadForThisOffer?.id?.trim() ||
      ""
    ).trim();
    if (!tid || !sessionReady || me.id === "guest") return;
    let cancelled = false;
    void fetchThreadRouteTramoSubscriptions(tid)
      .then((items) => {
        if (cancelled) return;
        applyThreadRouteTramoSubscriptions(tid, items, me.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [
    routeOffer?.threadId,
    resolvedOffer?.emergentThreadId,
    threadForThisOffer?.id,
    me.id,
    sessionReady,
    applyThreadRouteTramoSubscriptions,
  ]);
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

  const subscribeBlockedAsBuyerWithAgreement = useMemo(
    () =>
      routeOfferPublicBlockedForBuyerWithAgreement(routeOffer, threads, me.id),
    [routeOffer, threads, me.id],
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

  /**
   * Bootstrap deja `storeCatalogs` vacío (ver backend); sin hidratar, no se detectan servicios «Transportista».
   */
  const ownedStoreIdsKey = useMemo(() => {
    if (me.id === "guest") return "";
    return Object.entries(stores)
      .filter(([, b]) => b.ownerUserId === me.id)
      .map(([id]) => id)
      .sort((a, b) => a.localeCompare(b, "es"))
      .join("\0");
  }, [me.id, stores]);

  useEffect(() => {
    if (!ownedStoreIdsKey || me.id === "guest") return;
    const ids = ownedStoreIdsKey.split("\0").filter(Boolean);
    let cancelled = false;
    void (async () => {
      for (const sid of ids) {
        if (cancelled) return;
        if (useMarketStore.getState().storeCatalogs[sid] !== undefined)
          continue;
        try {
          const data = await fetchStoreDetail(sid, { userId: me.id });
          if (cancelled) return;
          useMarketStore.setState((s) => ({
            stores: { ...s.stores, [sid]: data.store },
            storeCatalogs: {
              ...s.storeCatalogs,
              [sid]: mergeStoreCatalogWithLocalExtras(
                s.storeCatalogs[sid],
                data.catalog,
              ),
            },
          }));
        } catch {
          /* sin catálogo: el usuario puede abrir su tienda para cargarlo */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me.id, ownedStoreIdsKey]);

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
          `Te asignaron a ${tramoNotifyLineFromOffer(routeOffer, sid)}. Puedes abrir el chat de la operación.`,
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

  const fichaMapLegs = useMemo(() => {
    if (!resolvedOffer || !routeOffer?.tramos?.length) return [];
    return buildEmergentMapLegs(resolvedOffer, routeOffer);
  }, [resolvedOffer, routeOffer]);

  const fichaLegKm = useLegKmForEmergentLegs(fichaMapLegs, routeOffer?.tramos);

  useEffect(() => {
    if (!offerId || !resolvedOffer) return;
    void trackRecommendationInteraction(offerId, "click").catch(
      () => undefined,
    );
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

  const confirmRouteSubscribe = useCallback(
    async (storeServiceId: string) => {
      if (!threadCatalogId || !chosenStopId) return;
      if (
        routeOfferPublicBlockedForBuyerWithAgreement(routeOffer, threads, me.id)
      ) {
        toast.error(ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES);
        return;
      }
      const opt = transportServiceOptions.find(
        (o) => o.serviceId === storeServiceId,
      );
      if (!opt) {
        toast.error("Elige un servicio de transporte válido.");
        return;
      }
      if (resolvedOffer?.id?.startsWith("emo_")) {
        const st = await fetchEmergentCarrierSubscriptionStatus(
          resolvedOffer.id,
        );
        if (st && !st.canSubscribe) {
          toast.error(
            st.message?.trim() ||
              ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES,
          );
          return;
        }
      }
      setSubscribeModalSubmitting(true);
      try {
        if (emergentPublicationId) {
          const api = await postEmergentTramoSubscriptionRequest(
            emergentPublicationId,
            {
              stopId: chosenStopId,
              storeServiceId,
            },
          );
          if (!api.ok) {
            toast.error(api.message);
            return;
          }
        }
        const ok = subscribeRouteOfferTramo(
          threadCatalogId,
          chosenStopId,
          {
            userId: me.id,
            displayName: me.name,
            phone: me.phone,
            trustScore: me.trustScore,
          },
          opt.label,
          storeServiceId,
        );
        if (ok) {
          toast.success(
            emergentPublicationId
              ? "Solicitud enviada. Los participantes del hilo recibieron un aviso. Pendiente de validación."
              : "Solicitud registrada. Pendiente de validación del vendedor o comprador.",
          );
          setPickedStopId(null);
          setSubscribeModalOpen(false);
        } else {
          toast.error("No se pudo suscribir a ese tramo.");
        }
      } finally {
        setSubscribeModalSubmitting(false);
      }
    },
    [
      threadCatalogId,
      chosenStopId,
      routeOffer,
      threads,
      me.id,
      me.name,
      me.phone,
      me.trustScore,
      resolvedOffer?.id,
      transportServiceOptions,
      subscribeRouteOfferTramo,
      emergentPublicationId,
    ],
  );

  const productFicha = useMemo(() => {
    if (!resolvedOffer) return null;
    const cat = storeCatalogs[resolvedOffer.storeId];
    if (!cat) return null;
    const oid = (
      resolvedOffer.emergentBaseOfferId?.trim() || resolvedOffer.id
    ).trim();
    if (!oid) return null;
    return cat.products.find((p) => p.id === oid) ?? null;
  }, [resolvedOffer, storeCatalogs]);

  /**
   * La ficha pública solo hidrata `offers`/`stores`, no `storeCatalogs`. Para que el
   * detalle (estilo storefront) muestre la ficha del producto, el precio unitario y
   * los productos relacionados a cualquier visitante, cargamos el catálogo público
   * de la tienda de la oferta si aún no está en memoria.
   */
  const offerStoreId = resolvedOffer?.storeId;
  useEffect(() => {
    if (!offerStoreId) return;
    if (useMarketStore.getState().storeCatalogs[offerStoreId] !== undefined)
      return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchStoreDetail(offerStoreId, { userId: me.id });
        if (cancelled) return;
        useMarketStore.setState((s) => ({
          stores: { ...s.stores, [offerStoreId]: data.store },
          storeCatalogs: {
            ...s.storeCatalogs,
            [offerStoreId]: mergeStoreCatalogWithLocalExtras(
              s.storeCatalogs[offerStoreId],
              data.catalog,
            ),
          },
        }));
      } catch {
        /* catálogo no disponible: la ficha degrada al enlace de la tienda */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [offerStoreId, me.id]);

  const addToCart = useCartStore((s) => s.addItem);

  /** Otros productos publicados de la misma tienda (grid inferior de la ficha, estilo storefront). */
  const relatedProducts = useMemo(() => {
    if (!resolvedOffer) return [];
    const cat = storeCatalogs[resolvedOffer.storeId];
    if (!cat) return [];
    const currentId = productFicha?.id ?? resolvedOffer.id;
    return cat.products
      .filter((p) => p.published && p.id !== currentId)
      .slice(0, 8);
  }, [resolvedOffer, storeCatalogs, productFicha]);

  const trackedProductId = productFicha?.id ?? null;
  useEffect(() => {
    if (trackedProductId) void reportProductView(trackedProductId);
  }, [trackedProductId]);

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
  const showRouteMapHero = isEmergentRouteFicha && fichaMapLegs.length > 0;
  const fichaDescriptionText = emergentRoutePublicationUserDescription(
    resolvedOffer,
    routeOffer,
  );

  const isOwnOffer =
    !!store?.ownerUserId && me.id !== "guest" && me.id === store.ownerUserId;

  const canLikeOffer = sessionReady && me.id !== "guest";

  function toggleOfferLikeNow() {
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
          err instanceof Error ? err.message : "No se pudo guardar el me gusta.",
        );
      }
    })();
  }

  function addFichaToCart(qty: number) {
    if (!resolvedOffer) return;
    const quantity = Math.max(1, qty);
    // Con ficha usamos sus datos; sin ella (catálogo aún no cargado) caemos a la
    // oferta pública para no bloquear la compra —el id de producto coincide con el
    // de la oferta—.
    if (productFicha) {
      addToCart({
        productId: productFicha.id,
        storeId: productFicha.storeId,
        name: productFicha.name,
        unitPrice: parseProductPriceNumber(productFicha.price) ?? 0,
        currencyCode:
          productFicha.monedaPrecio?.trim() || productFicha.monedas?.[0] || "",
        quantity,
        photoUrl: productFicha.photoUrls[0],
      });
    } else {
      addToCart({
        productId: resolvedOffer.id,
        storeId: resolvedOffer.storeId,
        name: resolvedOffer.title,
        unitPrice: parseProductPriceNumber(resolvedOffer.price) ?? 0,
        currencyCode: currencyCodeFromPriceText(resolvedOffer.price),
        quantity,
        photoUrl: resolvedOffer.imageUrl || resolvedOffer.imageUrls?.[0],
      });
    }
    toast.success("Añadido al carrito");
  }

  // Ficha de producto/servicio (no hoja de ruta): réplica del detalle de la app de
  // referencia (frontend-guest). Envuelta en `.store-front-surface` para que la
  // ficha y los comentarios adopten el estilo emerald/crema del storefront.
  if (!isEmergentRouteFicha) {
    return (
      <StorefrontChrome store={store}>
        <div className="mx-auto w-full max-w-[1140px] px-4 py-6 sm:py-10">
          <OfferProductDetail
            offer={resolvedOffer}
            productFicha={productFicha}
            store={store}
            gallery={galleryUrls}
            descriptionText={fichaDescriptionText}
            purchasable={!resolvedOffer.tags.includes("Servicio")}
            canLike={canLikeOffer}
            liked={!!resolvedOffer.viewerLikedOffer}
            likeCount={resolvedOffer.offerLikeCount ?? 0}
            onToggleLike={toggleOfferLikeNow}
            onAddToCart={addFichaToCart}
            onBuyNow={(qty) => {
              addFichaToCart(qty);
              nav("/cart");
            }}
            onOpenLightbox={(url) => setGalleryLightboxUrl(url)}
            relatedProducts={relatedProducts}
          />

          <div className="mt-10">
            <OfferCommentsSection
              offer={resolvedOffer}
              store={store}
              me={me}
              isSessionActive={isSessionActive}
              isOwnOffer={isOwnOffer}
              submitOfferQuestion={submitOfferQuestion}
            />
          </div>
        </div>

        <ImageLightbox
          url={galleryLightboxUrl}
          onClose={() => setGalleryLightboxUrl(null)}
        />
      </StorefrontChrome>
    );
  }

  return (
    <div className="container vt-page">
      <div className="flex flex-col gap-3.5">
        <div className="vt-card relative overflow-hidden">
          <div className="pointer-events-none absolute left-3 right-3 top-3 z-[2] flex items-center justify-between gap-2">
            <button
              type="button"
              className={offerHeroChromeBtnClass}
              onClick={() => nav(-1)}
            >
              <ArrowLeft size={16} />
            </button>
            <OfferSaveButton
              offerId={offerId ?? ""}
              className={offerHeroSaveBtnChromeClass}
            />
          </div>
          {showRouteMapHero ? (
            <div className="relative isolate z-0 h-[260px] w-full overflow-hidden bg-[#e2e8f0]">
              <EmergentRouteFeedMap
                legs={fichaMapLegs}
                mapKey={`offer-ficha-map-${resolvedOffer.id}`}
                interactive={false}
                className="h-[260px] w-full [&_.leaflet-control-attribution]:text-[8px]"
              />
              {offerId ? (
                <Link
                  to={`/offer/${encodeURIComponent(offerId)}/mapa`}
                  className="pointer-events-auto absolute bottom-2 right-2 z-10 rounded-lg border border-white/80 bg-[rgba(255,255,255,0.9)] px-2.5 py-1.5 text-[12px] font-extrabold text-slate-800 shadow-md backdrop-blur-sm hover:bg-white"
                >
                  Pantalla completa
                </Link>
              ) : null}
            </div>
          ) : (
            <div
              className={cn("relative", heroIsToolPlaceholder && "bg-gray-200")}
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
          {!showRouteMapHero && galleryUrls.length > 1 ? (
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
                  title="Inicia sesión para dar me gusta a la ficha"
                >
                  <Heart size={18} aria-hidden />
                  <span className="tabular-nums">
                    {resolvedOffer.offerLikeCount ?? 0}
                  </span>
                </span>
              )}
            </div>

            {fichaDescriptionText.trim() ? (
              <p className="text-[15px] leading-relaxed text-[var(--text)]">
                {fichaDescriptionText.trim()}
              </p>
            ) : null}

            <div className="vt-row flex-wrap justify-between">
              <Link
                to={storeHref(store)}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2.5 py-1.5 text-xs font-extrabold text-[var(--text)]"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                {store.name}
                {store.verified ? (
                  <span
                    className="ml-2 inline-flex items-center text-[var(--primary)]"
                    title="Verificado"
                    aria-label="Verificado"
                  >
                    <BadgeCheck size={16} aria-hidden />
                  </span>
                ) : null}
              </Link>
              {productFicha?.transportIncluded !== undefined ? (
                <span
                  className="vt-pill max-w-full"
                  title="Transporte incluido según la ficha del producto."
                >
                  <span className="inline-flex items-center gap-1">
                    <Truck size={14} aria-hidden />{" "}
                    {productFicha.transportIncluded
                      ? "Transporte incluido"
                      : "Sin transporte"}
                  </span>
                </span>
              ) : null}
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
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
                {actingAsCarrierOnThisOffer ? (
                  <div className="mt-3 rounded-[14px] border border-[color-mix(in_oklab,var(--primary)_28%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))] p-3.5">
                    <div className="text-sm font-black tracking-tight">
                      Suscribirme a un tramo
                    </div>
                    {subscribeBlockedAsBuyerWithAgreement ? (
                      <p className="mt-2 rounded-lg border border-[color-mix(in_oklab,var(--border)_90%,transparent)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2.5 py-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
                        {ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES}
                      </p>
                    ) : null}
                    {!subscribeBlockedAsBuyerWithAgreement ? (
                      <>
                        <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                          Elige un tramo libre y envía la solicitud. Puedes
                          suscribirte a <strong>más de un tramo</strong> en la
                          misma hoja; cada uno se valida por separado. El
                          vendedor y el comprador deben <strong>validar</strong>{" "}
                          la suscripción antes de que puedas entrar al chat
                          operativo de la ruta.
                        </p>
                        {carrierPendingOnRoute ? (
                          <p className="mt-2 rounded-lg border border-[color-mix(in_oklab,#d97706_35%,var(--border))] bg-[color-mix(in_oklab,#d97706_8%,var(--surface))] px-2.5 py-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
                            Tienes al menos una solicitud pendiente de
                            validación. Mientras tanto puedes pedir otro tramo
                            si sigue libre; cuando te acepten en cualquiera de
                            ellos puedes habilitar el chat (según reglas de la
                            demo).
                          </p>
                        ) : null}
                        {carrierConfirmedOnRoute ? (
                          <p className="mt-2 rounded-lg border border-[color-mix(in_oklab,var(--good)_30%,var(--border))] bg-[color-mix(in_oklab,var(--good)_7%,var(--surface))] px-2.5 py-2 text-[13px] font-semibold leading-snug text-[var(--text)]">
                            Suscripción confirmada: ya puedes abrir el chat de
                            la operación.
                          </p>
                        ) : null}
                        {openTramos.length === 0 ? (
                          <p className="mt-2 text-[13px] font-semibold text-[var(--text)]">
                            Todos los tramos tienen transportista asignado o
                            pendiente.
                          </p>
                        ) : (
                          <div className="mt-2 flex flex-col gap-2">
                            {openTramos.map((t) => {
                              const li = fichaMapLegs.findIndex(
                                (l) => l.orden === t.orden,
                              );
                              const meta = li >= 0 ? fichaMapLegs[li] : null;
                              const km = li >= 0 ? (fichaLegKm[li] ?? 0) : 0;
                              const mapHint = tramoMapSubrouteHint(
                                fichaMapLegs,
                                t.orden,
                              );
                              const kmLine = formatKmEs(km);
                              const rateLine = formatPrecioPorKmEs(
                                meta?.precioTramo,
                                meta?.monedaPago,
                                km,
                              );
                              return (
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
                                  <span className="min-w-0 flex-1 text-[13px] leading-snug">
                                    <span className="font-semibold text-[var(--text)]">
                                      <strong>Tramo {t.orden}</strong>
                                      <span className="font-extrabold text-[var(--muted)]">
                                        {" "}
                                        · {mapHint}
                                      </span>
                                    </span>
                                    <span className="mt-0.5 block text-[12px] font-semibold leading-snug text-[var(--muted)]">
                                      {kmLine}
                                      <span className="text-[var(--text)]">
                                        {" "}
                                        · {rateLine}
                                      </span>
                                    </span>
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!subscribeBlockedAsBuyerWithAgreement ? (
                        <button
                          type="button"
                          className="vt-btn vt-btn-primary"
                          disabled={
                            !chosenStopId ||
                            openTramos.length === 0 ||
                            transportServiceOptions.length === 0
                          }
                          title={
                            transportServiceOptions.length === 0
                              ? "Necesitas al menos un servicio de transporte publicado en tu tienda"
                              : undefined
                          }
                          onClick={() => setSubscribeModalOpen(true)}
                        >
                          Enviar solicitud de suscripción
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="vt-btn"
                        disabled={!canOpenRouteChat}
                        title={
                          canOpenRouteChat
                            ? "Abrir el chat de la operación"
                            : "Disponible con tramo validado o si ya figuras como integrante del hilo"
                        }
                        onClick={() => {
                          if (!canOpenRouteChat) {
                            toast.error(
                              "El chat se habilita con tramo validado o cuando ya eres miembro del hilo de esta oferta.",
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
                          const opThreadId = (
                            routeOffer?.threadId?.trim() ||
                            resolvedOffer.emergentThreadId?.trim() ||
                            threadForThisOffer?.id?.trim() ||
                            ""
                          ).trim();
                          if (!opThreadId.startsWith("cth_")) {
                            toast.error(
                              "No se encontró el hilo de esta operación. Recarga la ficha o entra desde la notificación del chat.",
                            );
                            return;
                          }
                          nav(`/chat/${opThreadId}`);
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
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                className="vt-btn vt-btn-primary min-[420px]:flex-1"
                disabled={isOwnOffer || subscribeBlockedAsBuyerWithAgreement}
                title={
                  isOwnOffer
                    ? "No puedes suscribirte a tu propia publicación."
                    : subscribeBlockedAsBuyerWithAgreement
                      ? ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES
                      : undefined
                }
                onClick={() => {
                  if (!isSessionActive || me.id === "guest") {
                    openAuthModal();
                    return;
                  }
                  if (isOwnOffer) {
                    toast.error("No puedes suscribirte a tu propia oferta.");
                    return;
                  }
                  if (subscribeBlockedAsBuyerWithAgreement) {
                    toast.error(ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES);
                    return;
                  }
                  if (!userHasTransportService(me.id, stores, storeCatalogs)) {
                    toast.error(
                      "Necesitas un servicio de transporte publicado en tu tienda para suscribirte.",
                    );
                    return;
                  }
                  if (!routeOffer) {
                    toast.error(
                      "Aún no tenemos la hoja de ruta en esta sesión. Entra desde el inicio o recarga la página.",
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

      <RouteTramoSubscribeModal
        open={subscribeModalOpen}
        onClose={() =>
          !subscribeModalSubmitting && setSubscribeModalOpen(false)
        }
        services={transportServiceOptions}
        initialServiceId={selectedTransportServiceId}
        stopSummary={stopSummaryForModal}
        submitting={subscribeModalSubmitting}
        onConfirm={(sid) => {
          void confirmRouteSubscribe(sid);
        }}
      />

      <ImageLightbox
        url={galleryLightboxUrl}
        onClose={() => setGalleryLightboxUrl(null)}
      />
    </div>
  );
}
