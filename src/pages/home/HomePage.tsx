import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import type { Offer } from "../../app/store/useMarketStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { Search } from "lucide-react";
import { fetchRecommendationBatch } from "../../utils/recommendations/recommendationsApi";
import {
  applyBottomRecommendationBatch,
  buildHomeFeedSegments,
} from "./homeFeedMerge";
import { FeedLoadingSpinner } from "./FeedLoadingSpinner";
import { OfferCardsChunk } from "./OfferCardsChunk";
import { RecommendedStoresRow } from "./RecommendedStoresRow";

/** No guardar/restaurar scroll del feed en dev local (solo memoria de app en otros hosts). */
function isHomeScrollPersistenceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h !== "localhost" && h !== "127.0.0.1" && h !== "[::1]";
}

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
  const recommendationFeedExhausted = useMarketStore(
    (s) => s.recommendationFeedExhausted,
  );
  const recommendationBatchSize = useMarketStore(
    (s) => s.recommendationBatchSize,
  );
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const loadMoreInFlightRef = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const feedSegments = useMemo(
    () => buildHomeFeedSegments(offerIds, recommendationStoreStripAnchors),
    [offerIds, recommendationStoreStripAnchors],
  );

  const persistHomeScroll = useCallback(() => {
    if (!isHomeScrollPersistenceEnabled()) return;
    const y = window.scrollY;
    if (y > 0) useAppStore.getState().setHomeFeedScrollY(y);
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
      if (!isHomeScrollPersistenceEnabled()) return;
      const y = useAppStore.getState().homeFeedScrollY;
      if (y == null || !Number.isFinite(y) || y < 1) return;
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
    if (isHomeScrollPersistenceEnabled()) {
      useAppStore.getState().setHomeFeedScrollY(null);
    }
    window.scrollTo(0, 0);
  }, [location.pathname, navigationType]);

  useEffect(() => {
    const bottomNode = loadMoreRef.current;
    console.log({ recommendationFeedExhausted });
    if (!bottomNode || recommendationFeedExhausted) return;
    let disposed = false;

    const obsBottom = new IntersectionObserver(
      (entries) => {
        console.log("IntersectionObserver");
        const first = entries[0];
        if (!first?.isIntersecting || loadMoreInFlightRef.current) return;

        loadMoreInFlightRef.current = true;
        setLoadingMore(true);
        void (async () => {
          const innerH = window.innerHeight;
          const docH0 = document.documentElement.scrollHeight;
          const wasNearBottom = window.scrollY + innerH >= docH0 - innerH * 0.2;

          try {
            const live = useMarketStore.getState();
            console.log({ RecommendationCursor: live.recommendationCursor });
            const batch = await fetchRecommendationBatch(
              live.recommendationCursor,
              live.recommendationBatchSize || 20,
            );
            if (disposed) return;
            console.log({ batchOfferIdsLength: batch.offerIds.length });
            if (batch.offerIds.length === 0) {
              useMarketStore.setState((s) => ({
                ...s,
                recommendationCursor: batch.nextCursor,
                /** Solo sin catálogo real; si hay ofertas, el scroll sigue (wrap / reintentos). */
                recommendationFeedExhausted: (batch.totalAvailable ?? 0) === 0,
                recommendationTotalAvailable: batch.totalAvailable,
                recommendationBatchSize:
                  batch.batchSize ?? s.recommendationBatchSize,
                recommendationThreshold: batch.threshold,
              }));
              return;
            }
            useMarketStore.setState((state) => {
              const patch = applyBottomRecommendationBatch(state, batch);
              return patch ? { ...state, ...patch } : state;
            });
            /**
             * Si cargó estando al fondo, subir el scroll un poco para que el sentinel salga
             * del margen del IntersectionObserver (evita ráfagas al endpoint). El usuario puede
             * volver a bajar para pedir otro lote.
             */
            console.log({
              wasNearBottom,
              docH0,
              disposed,
              y: window.scrollY,
              innerH,
            });
            // if (wasNearBottom && !disposed) {
            //   const nudgePx = docH0 * 0.2;
            //   requestAnimationFrame(() => {
            //     requestAnimationFrame(() => {
            //       if (disposed) return;
            //       const y = window.scrollY;
            //       window.scrollTo(0, Math.max(0, y - nudgePx));
            //     });
            //   });
            // }
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

    obsBottom.observe(bottomNode);
    return () => {
      disposed = true;
      obsBottom.disconnect();
    };
  }, [recommendationFeedExhausted, recommendationBatchSize]);

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
