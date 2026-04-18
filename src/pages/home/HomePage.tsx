import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import toast from "react-hot-toast";
import { cn } from "../../lib/cn";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";
import { StoreTrustMini } from "../../components/StoreTrustMini";
import { StoreLocationMiniMap } from "../../components/store/StoreLocationMiniMap";
import type { StoreLocationPoint } from "../../app/store/marketStoreTypes";
import type { RouteOfferPublicState } from "../../app/store/marketStoreTypes";
import type { StoreCatalog } from "../../pages/chat/domain/storeCatalogTypes";
import type { Offer, StoreBadge } from "../../app/store/useMarketStore";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { RouteOfferPreview } from "../offer/RouteOfferPreview";
import { OfferSaveButton } from "../offer/OfferSaveButton";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Search,
  Store,
} from "lucide-react";
import { toggleOfferLike } from "../../utils/market/offerEngagementApi";
import {
  isToolPlaceholderUrl,
  TOOL_PLACEHOLDER_SRC,
} from "../../utils/market/toolPlaceholder";
import { fetchRecommendationBatch } from "../../utils/recommendations/recommendationsApi";
import {
  applyBottomRecommendationBatch,
  applyTopRecommendationBatch,
  buildHomeFeedSegments,
  trimBatchForPrepend,
} from "./homeFeedMerge";

const HOME_FEED_SCROLL_KEY = "vt-home-feed-scroll-y";

function storeCategoriesLabel(categories: string[], max = 3): string {
  const c = categories.map((x) => x.trim()).filter(Boolean);
  if (c.length === 0) return "Sin categoría";
  return c.slice(0, max).join(" · ");
}

function isValidStoreLocation(
  loc: StoreLocationPoint | undefined,
): loc is StoreLocationPoint {
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") return false;
  return Number.isFinite(loc.lat) && Number.isFinite(loc.lng);
}

/** Texto corto con elipsis si supera `maxChars` (palabras largas sin espacios también se cortan). */
/** Descripción de oferta en una línea con elipsis (texto + CSS `line-clamp`). */
function offerDescriptionPreview(text: string | undefined, maxChars = 96): string {
  const raw = (text ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (raw.length <= maxChars) return raw;
  let cut = raw.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.55) cut = cut.slice(0, lastSpace);
  return `${cut.trimEnd()}…`;
}

function storeDescriptionSnippet(
  pitchFromBadge: string | undefined,
  catalogPitch: string | undefined,
  maxChars = 110,
): string {
  const raw = (pitchFromBadge ?? catalogPitch ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (raw.length <= maxChars) return raw;
  let cut = raw.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.55) cut = cut.slice(0, lastSpace);
  return `${cut.trimEnd()}…`;
}

function FeedLoadingSpinner({ label }: Readonly<{ label: string }>) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-10 w-10 shrink-0 rounded-full border-2 border-solid border-[var(--border)] border-t-[var(--primary)] motion-safe:animate-spin"
        aria-hidden
      />
      <span className="text-sm font-semibold text-[var(--muted)]">{label}</span>
    </div>
  );
}

function OfferCardsChunk({
  items,
  stores,
  routeOfferPublic,
}: Readonly<{
  items: Offer[];
  stores: Record<string, StoreBadge>;
  routeOfferPublic: Partial<Record<string, RouteOfferPublicState>>;
}>) {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  return (
    <div className="grid grid-cols-12 gap-3 md:gap-3.5">
      {items.map((o) => {
        const store = stores[o.storeId];
        const descFull = o.description?.trim() ?? "";
        const descPreview = offerDescriptionPreview(descFull);
        const routePreview = routeOfferPublic[o.id];
        const commentTotal =
          typeof o.publicCommentCount === "number"
            ? o.publicCommentCount
            : (o.qa?.length ?? 0);
        const offerLikes = o.offerLikeCount ?? 0;
        const likedOffer = o.viewerLikedOffer ?? false;
        const thumbSrc =
          o.imageUrl?.trim() ||
          (o.tags.includes("Servicio") ? TOOL_PLACEHOLDER_SRC : undefined);
        const isToolPlaceholder = isToolPlaceholderUrl(thumbSrc);
        return (
          <div
            key={o.id}
            className="vt-card col-span-12 min-w-0 overflow-hidden md:col-span-6 lg:col-span-4"
          >
            <div className="relative h-[150px] overflow-hidden bg-gray-200 lg:h-[132px]">
              <Link
                to={`/offer/${o.id}`}
                className={cn(
                  "block h-full overflow-hidden",
                  !isToolPlaceholder && "group",
                )}
              >
                <ProtectedMediaImg
                  src={thumbSrc}
                  alt={o.title}
                  wrapperClassName="block h-full w-full min-h-[150px] lg:min-h-[132px]"
                  className={cn(
                    "block h-full w-full min-h-[150px] transition-transform duration-[240ms] ease-out lg:min-h-[132px]",
                    isToolPlaceholder
                      ? "vt-img-tool-placeholder bg-gray-200 p-3 sm:p-4 lg:p-3"
                      : "scale-[1.02] object-cover group-hover:scale-[1.06]",
                  )}
                />
              </Link>
              <div className="pointer-events-auto absolute right-1.5 top-1.5 z-[2] lg:right-1 lg:top-1">
                <OfferSaveButton offerId={o.id} />
              </div>
            </div>

            <div className="flex flex-col gap-2 p-3 lg:gap-2 lg:p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 font-black tracking-[-0.02em] text-[15px] leading-tight lg:text-sm">
                  <Link to={`/offer/${o.id}`} className="line-clamp-2">
                    {o.title}
                  </Link>
                </div>
                <div className="shrink-0 font-black text-[var(--text)] text-sm lg:text-xs">
                  {o.price}
                </div>
              </div>

              {descPreview ? (
                <p
                  className="vt-muted line-clamp-1 min-w-0 break-words text-[11px] leading-snug lg:text-[10px]"
                  title={descFull.length > descPreview.length ? descFull : undefined}
                >
                  {descPreview}
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-2 text-[11px] lg:text-[10px]">
                <span className="inline-flex min-w-0 items-center gap-1 text-[var(--muted)]">
                  <MessageCircle
                    size={14}
                    className="shrink-0 text-[var(--primary)]"
                    aria-hidden
                  />
                  <span className="truncate font-bold text-[var(--text)]">
                    {commentTotal}{" "}
                    <span className="font-semibold text-[var(--muted)]">
                      {commentTotal === 1 ? "comentario" : "comentarios"}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2 py-0.5 font-extrabold text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--muted)_10%,var(--surface))]"
                  title={likedOffer ? "Quitar me gusta" : "Me gusta"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isSessionActive) {
                      openAuthModal();
                      return;
                    }
                    void (async () => {
                      try {
                        const r = await toggleOfferLike(o.id);
                        useMarketStore.setState((s) => {
                          const prev = s.offers[o.id];
                          if (!prev) return s;
                          return {
                            ...s,
                            offers: {
                              ...s.offers,
                              [o.id]: {
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
                    size={14}
                    className={cn(
                      likedOffer &&
                        "fill-[color-mix(in_oklab,var(--bad)_50%,#f43f5e)] text-[color-mix(in_oklab,var(--bad)_50%,#f43f5e)]",
                    )}
                    aria-hidden
                  />
                  <span className="tabular-nums">{offerLikes}</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Link
                  to={`/store/${store?.id ?? o.storeId}`}
                  className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2 py-1 text-[11px] font-extrabold text-[var(--text)] lg:px-1.5 lg:text-[10px]"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                  <span className="truncate">{store?.name ?? "Tienda"}</span>
                </Link>
              </div>

              <div className="flex flex-wrap gap-1.5 lg:gap-1">
                {o.tags.map((t) => (
                  <span key={t} className="vt-pill text-[11px] lg:text-[10px]">
                    {t}
                  </span>
                ))}
              </div>
              {routePreview ? (
                <RouteOfferPreview
                  state={routePreview}
                  compact
                  className="mt-2.5"
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Carril de tiendas sugeridas: scroll horizontal sin barra visible + flechas. */
function RecommendedStoresRow({
  storeIds,
  stores,
  storeCatalogs,
  embedded,
}: Readonly<{
  storeIds: string[];
  stores: Record<string, StoreBadge>;
  storeCatalogs: Record<string, StoreCatalog>;
  /** Dentro del feed intercalado (menos margen vertical). */
  embedded?: boolean;
}>) {
  const resolved = useMemo(
    () =>
      storeIds
        .map((id) => stores[id])
        .filter((s): s is StoreBadge => s != null),
    [storeIds, stores],
  );
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const eps = 3;
    setCanScrollLeft(scrollLeft > eps);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - eps);
  }, []);

  useLayoutEffect(() => {
    updateScrollEdges();
  }, [resolved, updateScrollEdges]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollEdges();
    el.addEventListener("scroll", updateScrollEdges, { passive: true });
    const ro = new ResizeObserver(updateScrollEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollEdges);
      ro.disconnect();
    };
  }, [resolved.length, updateScrollEdges]);

  const scrollStep = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(160, Math.floor(el.clientWidth * 0.72)) * dir;
    el.scrollBy({ left: step, behavior: "smooth" });
  }, []);

  if (resolved.length === 0) return null;

  const arrowBtn =
    "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[var(--text)] shadow-sm transition-[opacity,colors] hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-35";

  return (
    <div
      className={cn(
        "min-w-0",
        embedded ? "mb-3 md:mb-3.5" : "mb-4",
      )}
    >
      <p
        className={cn(
          "font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]",
          embedded ? "mb-1.5 text-[10px]" : "mb-2 text-[11px]",
        )}
      >
        Tiendas para vos
      </p>
      <div className="flex min-w-0 items-stretch gap-1.5 sm:gap-2">
        <button
          type="button"
          className={arrowBtn}
          aria-label="Ver tiendas anteriores"
          disabled={!canScrollLeft}
          onClick={() => scrollStep(-1)}
        >
          <ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
        </button>
        <div
          ref={scrollerRef}
          className="min-w-0 flex-1 touch-pan-x overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label="Tiendas recomendadas"
        >
          <div className="flex w-max gap-3 pl-0.5 pr-4">
            {resolved.map((s) => {
              const cat = storeCatalogs[s.id];
              const desc = storeDescriptionSnippet(s.pitch, cat?.pitch);
              const fullDesc = (s.pitch ?? cat?.pitch ?? "").trim();
              return (
                <Link
                  key={s.id}
                  to={`/store/${s.id}`}
                  role="listitem"
                  className="vt-card flex w-[min(300px,88vw)] shrink-0 flex-col gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-left transition-colors hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                      {s.avatarUrl?.trim() ? (
                        <ProtectedMediaImg
                          src={s.avatarUrl.trim()}
                          alt=""
                          wrapperClassName="h-full w-full"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Store size={20} className="text-[var(--muted)]" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-[14px] font-black leading-tight tracking-[-0.02em] text-[var(--text)]">
                        {s.name}
                      </div>
                      <div className="mt-0.5 text-[11px] font-semibold leading-snug text-[var(--muted)]">
                        {storeCategoriesLabel(s.categories)}
                      </div>
                    </div>
                  </div>
                  <StoreTrustMini score={s.trustScore} className="max-w-full" />
                  {isValidStoreLocation(s.location) ? (
                    <div className="w-full max-w-[220px] self-start overflow-hidden rounded-lg">
                      <StoreLocationMiniMap
                        location={s.location}
                        mapKey={`${s.id}-${s.location.lat}-${s.location.lng}`}
                      />
                    </div>
                  ) : (
                    <div className="flex h-[88px] w-full max-w-[220px] items-center justify-center self-start rounded-lg border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_70%,var(--surface))] px-2 text-center text-[10px] font-semibold leading-tight text-[var(--muted)]">
                      Sin ubicación en mapa
                    </div>
                  )}
                  {desc ? (
                    <p
                      className="line-clamp-2 min-h-0 break-words text-[11px] leading-snug text-[var(--muted)]"
                      title={fullDesc.length > desc.length ? fullDesc : undefined}
                    >
                      {desc}
                    </p>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          className={arrowBtn}
          aria-label="Ver más tiendas"
          disabled={!canScrollRight}
          onClick={() => scrollStep(1)}
        >
          <ChevronRight size={20} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  );
}

// Búsqueda de catálogo: ruta `/search` (barra en Home).

export function HomePage() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();

  const offerIds = useMarketStore((s) => s.offerIds);
  const offers = useMarketStore((s) => s.offers);
  const stores = useMarketStore((s) => s.stores);
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  const recommendationStoreStripAnchors = useMarketStore(
    (s) => s.recommendationStoreStripAnchors,
  );
  const routeOfferPublic = useMarketStore((s) => s.routeOfferPublic);
  const recommendationCursor = useMarketStore((s) => s.recommendationCursor);
  const recommendationFeedStartIndex = useMarketStore(
    (s) => s.recommendationFeedStartIndex,
  );
  const recommendationTotalAvailable = useMarketStore(
    (s) => s.recommendationTotalAvailable,
  );
  const recommendationBatchSize = useMarketStore(
    (s) => s.recommendationBatchSize,
  );
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadPrevRef = useRef<HTMLDivElement | null>(null);
  /** Ancla estable bajo el sentinel superior: al anteponer ofertas se corrige scroll con su delta en pantalla. */
  const feedScrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const loadMoreInFlightRef = useRef(false);
  const loadPrevInFlightRef = useRef(false);
  /** Tras cargar más abajo: evita que el IO dispare otra petición al instante. */
  const lastBottomAppendAtRef = useRef(0);
  /** Evita ráfagas de /recommendations al dejar el tope intersectando tras un prepend. */
  const lastTopPrependAtRef = useRef(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);

  const feedSegments = useMemo(
    () => buildHomeFeedSegments(offerIds, recommendationStoreStripAnchors),
    [offerIds, recommendationStoreStripAnchors],
  );

  const persistHomeScroll = useCallback(() => {
    const y = window.scrollY;
    if (y > 0) sessionStorage.setItem(HOME_FEED_SCROLL_KEY, String(y));
  }, []);

  useEffect(() => {
    if (location.pathname !== "/home") return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        persistHomeScroll();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      persistHomeScroll();
    };
  }, [location.pathname, persistHomeScroll]);

  /**
   * POP (atrás): restaurar scroll guardado. PUSH/REPLACE: ir arriba y limpiar posición guardada
   * (p. ej. tab Home) para no reutilizar un offset viejo.
   */
  useLayoutEffect(() => {
    if (location.pathname !== "/home") return;
    if (navigationType === "POP") {
      const raw = sessionStorage.getItem(HOME_FEED_SCROLL_KEY);
      if (raw == null) return;
      const y = Number.parseFloat(raw);
      if (!Number.isFinite(y) || y < 1) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const maxY = Math.max(
            0,
            document.documentElement.scrollHeight - window.innerHeight,
          );
          window.scrollTo(0, Math.min(y, maxY));
        });
      });
      return;
    }
    sessionStorage.removeItem(HOME_FEED_SCROLL_KEY);
    window.scrollTo(0, 0);
  }, [location.pathname, navigationType]);

  useEffect(() => {
    const bottomNode = loadMoreRef.current;
    const topNode = loadPrevRef.current;
    if (!bottomNode || recommendationTotalAvailable <= 0) return;

    let disposed = false;

    const obsBottom = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting || loadMoreInFlightRef.current) return;
        if (Date.now() - lastBottomAppendAtRef.current < 480) return;

        loadMoreInFlightRef.current = true;
        setLoadingMore(true);
        void (async () => {
          const scrollYKeep = window.scrollY;
          const docH0 = document.documentElement.scrollHeight;
          const innerH = window.innerHeight;
          const wasNearBottom =
            scrollYKeep + innerH >= docH0 - Math.min(96, innerH * 0.12);

          try {
            const live = useMarketStore.getState();
            const batch = await fetchRecommendationBatch(
              live.recommendationCursor,
              live.recommendationBatchSize || 20,
            );
            if (disposed) return;
            if (batch.offerIds.length === 0) return;
            useMarketStore.setState((state) => {
              const patch = applyBottomRecommendationBatch(state, batch);
              return patch ? { ...state, ...patch } : state;
            });
            lastBottomAppendAtRef.current = Date.now();
            if (wasNearBottom && !disposed) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (disposed) return;
                  window.scrollTo(0, scrollYKeep);
                });
              });
            }
          } catch (e) {
            if (!disposed) {
              toast.error(
                e instanceof Error && e.message
                  ? e.message
                  : "No se pudieron cargar más recomendaciones.",
              );
            }
          } finally {
            loadMoreInFlightRef.current = false;
            if (!disposed) setLoadingMore(false);
          }
        })();
      },
      /** Solo margen inferior: prefetch moderado sin disparar el fondo desde muy arriba. */
      { rootMargin: "0px 0px 200px 0px" },
    );

    const obsTop = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting || loadPrevInFlightRef.current) return;
        const fs0 = useMarketStore.getState().recommendationFeedStartIndex ?? 0;
        if (fs0 <= 0) return;
        const now = Date.now();
        if (now - lastTopPrependAtRef.current < 550) return;

        loadPrevInFlightRef.current = true;
        const anchorEl = feedScrollAnchorRef.current;
        const anchorTopBefore = anchorEl?.getBoundingClientRect().top ?? 0;
        setLoadingPrev(true);
        void (async () => {
          try {
            const live = useMarketStore.getState();
            const takeN = live.recommendationBatchSize || 20;
            const feedStart = live.recommendationFeedStartIndex ?? 0;
            if (feedStart <= 0) return;
            const requestCursor = Math.max(0, feedStart - takeN);
            const batchRaw = await fetchRecommendationBatch(
              requestCursor,
              takeN,
            );
            if (disposed) return;
            const batch = trimBatchForPrepend(
              batchRaw,
              feedStart,
              requestCursor,
            );
            if (batch.offerIds.length === 0) {
              lastTopPrependAtRef.current = Date.now();
              return;
            }

            useMarketStore.setState((state) => {
              const patch = applyTopRecommendationBatch(
                state,
                batch,
                requestCursor,
              );
              return patch ? { ...state, ...patch } : state;
            });

            lastTopPrependAtRef.current = Date.now();

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const el = feedScrollAnchorRef.current;
                if (!el || el !== anchorEl) return;
                const anchorTopAfter = el.getBoundingClientRect().top;
                const dy = anchorTopAfter - anchorTopBefore;
                if (dy !== 0) window.scrollBy(0, dy);
              });
            });
          } catch (e) {
            if (!disposed) {
              toast.error(
                e instanceof Error && e.message
                  ? e.message
                  : "No se pudieron cargar ofertas anteriores.",
              );
            }
          } finally {
            loadPrevInFlightRef.current = false;
            if (!disposed) setLoadingPrev(false);
          }
        })();
      },
      { rootMargin: "120px 0px 0px 0px" },
    );

    obsBottom.observe(bottomNode);
    if (topNode) obsTop.observe(topNode);
    return () => {
      disposed = true;
      obsBottom.disconnect();
      obsTop.disconnect();
    };
  }, [
    recommendationBatchSize,
    recommendationCursor,
    recommendationFeedStartIndex,
    recommendationTotalAvailable,
  ]);

  return (
    <div className="container vt-page">
      <div className="mb-3 mt-2">
        <div className="mb-3">
          <h1 className="vt-h1">Ofertas</h1>
          <div className="vt-muted">
            Explorá ofertas publicadas en la plataforma.
          </div>
        </div>
        <button
          type="button"
          className="flex w-full max-w-2xl items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          onClick={() => navigate("/search")}
          aria-label="Abrir búsqueda de tiendas, productos y servicios"
        >
          <Search
            size={20}
            strokeWidth={2.25}
            className="shrink-0 text-[var(--muted)]"
            aria-hidden
          />
          <span className="truncate text-[14px] text-[var(--muted)]">
            Buscar tiendas, productos o servicios…
          </span>
        </button>
      </div>

      <div ref={loadPrevRef} className="h-2 w-full shrink-0" aria-hidden />
      <div
        ref={feedScrollAnchorRef}
        className="pointer-events-none h-0 w-full shrink-0 overflow-hidden"
        aria-hidden
      />
      {loadingPrev ? (
        <FeedLoadingSpinner label="Cargando ofertas anteriores…" />
      ) : null}

      {feedSegments.map((seg, idx) => {
        if (seg.type === "offers") {
          const chunkItems = seg.offerIds
            .map((id) => offers[id])
            .filter((o): o is Offer => o != null);
          if (chunkItems.length === 0) return null;
          return (
            <section
              key={`home-offers-${idx}`}
              className="home-offer-chunk mb-3 min-w-0 md:mb-3.5"
              aria-label="Ofertas"
            >
              <OfferCardsChunk
                items={chunkItems}
                stores={stores}
                routeOfferPublic={routeOfferPublic}
              />
            </section>
          );
        }
        return (
          <section
            key={`home-stores-${idx}`}
            className="home-store-chunk min-w-0"
            aria-label="Tiendas sugeridas"
          >
            <RecommendedStoresRow
              embedded
              storeIds={seg.storeIds}
              stores={stores}
              storeCatalogs={storeCatalogs}
            />
          </section>
        );
      })}
      <div ref={loadMoreRef} className="h-10 shrink-0" aria-hidden />
      {loadingMore ? (
        <FeedLoadingSpinner label="Cargando más sugerencias…" />
      ) : null}
    </div>
  );
}
