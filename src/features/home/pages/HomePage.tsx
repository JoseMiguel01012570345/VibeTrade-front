import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import type {
  MarketState,
  Offer,
  StoreBadge,
} from "@features/market/logic/store/useMarketStore";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import type { RecommendationBatch } from "@app/bootstrap/bootstrapTypes";
import { useHomeFeedLoader } from "../hooks/useHomeFeed";
import {
  RECOMMENDATION_API_TAKE,
  appendHomeBulksFromApiBag,
  shouldFetchRecommendationBag,
  shouldMergePendingBag,
} from "../logic/homeFeedMerge";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { OfferCardsChunk } from "../components/OfferCardsChunk";
import { RecommendedStoresRow } from "../components/RecommendedStoresRow";
import { HomeStoresMobileSheet } from "../components/HomeStoresMobileSheet";
import {
  organicFeedOverlayClass,
  organicFeedPanelClass,
  organicSlideBgClass,
} from "@shared/styles/organicCardStyles";

const emptySignals = {
  next: null as string | null,
  prev: null as string | null,
};

const carouselEase =
  "transition-transform duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)]";

export function HomePage() {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const wasSessionActiveRef = useRef(isSessionActive);

  /** Tras iniciar sesión sin recargar, el feed de invitado podía dejar `exhausted` y dejar de pedir lotes. */
  useEffect(() => {
    if (isSessionActive && !wasSessionActiveRef.current) {
      useMarketStore.setState({ recommendationFeedExhausted: false });
    }
    wasSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  const routeOfferPublic = useMarketStore((s) => s.routeOfferPublic);
  const recommendationFeedExhausted = useMarketStore(
    (s) => s.recommendationFeedExhausted,
  );
  const recommendationHomeBulks = useMarketStore(
    (s) => s.recommendationHomeBulks,
  );
  const offerIds = useMarketStore((s) => s.offerIds);
  const recommendationStoreStripAnchors = useMarketStore(
    (s) => s.recommendationStoreStripAnchors,
  );
  const recommendationBagStartBulkIdx = useMarketStore(
    (s) => s.recommendationBagStartBulkIdx,
  );

  const displayBulks = useMemo(() => {
    if (recommendationHomeBulks.length > 0) return recommendationHomeBulks;
    if (offerIds.length === 0) return [];
    const strip0 =
      recommendationStoreStripAnchors.find((a) => a.beforeOfferIndex === 0)
        ?.storeIds ?? [];
    return [
      {
        storeIds: strip0,
        offerIds: [...offerIds],
        ...emptySignals,
      },
    ];
  }, [recommendationHomeBulks, offerIds, recommendationStoreStripAnchors]);

  const offers = useMarketStore(
    useShallow(
      useCallback(
        (s: MarketState) => {
          const o: Record<string, Offer> = {};
          for (const b of displayBulks) {
            for (const id of b.offerIds) {
              const t = String(id).trim();
              if (!t) continue;
              const v = s.offers[t];
              if (v) o[t] = v;
            }
          }
          return o;
        },
        [displayBulks],
      ),
    ),
  );

  const stores = useMarketStore(
    useShallow(
      useCallback(
        (s: MarketState) => {
          const ids = new Set<string>();
          for (const b of displayBulks) {
            for (const sid of b.storeIds) {
              const t = String(sid).trim();
              if (t) ids.add(t);
            }
            for (const oid of b.offerIds) {
              const o = s.offers[String(oid).trim()];
              const st = o?.storeId != null ? String(o.storeId).trim() : "";
              if (st) ids.add(st);
            }
          }
          const out: Record<string, StoreBadge> = {};
          for (const id of ids) {
            const st = s.stores[id];
            if (st) out[id] = st;
          }
          return out;
        },
        [displayBulks],
      ),
    ),
  );

  const [cardIdx, setCardIdx] = useState(0);
  const [pendingBag, setPendingBag] = useState<RecommendationBatch | null>(
    null,
  );
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const isAnimatingRef = useRef(false);
  const prefetchInFlightRef = useRef(false);
  const [prefetchBusy, setPrefetchBusy] = useState(false);
  /** Un frame tras fusionar la bolsa en el store (7.ª tarjeta). */
  const [applyingNextBag, setApplyingNextBag] = useState(false);
  /** Evita animar translateY al colocar la tarjeta tras fusionar una bolsa nueva. */
  const [mergeSnapTransition, setMergeSnapTransition] = useState(false);
  /** Tras aplicar merge en el store, ocultar el overlay en el siguiente commit (post-pintado). */
  const feedUpdateClearAfterPaintRef = useRef(false);

  const [homeStoresSheetOpen, setHomeStoresSheetOpen] = useState(false);
  const cardCountRef = useRef(0);
  const cardCount = displayBulks.length;
  cardCountRef.current = cardCount;
  const bulksInCurrentBag = Math.max(
    0,
    cardCount - recommendationBagStartBulkIdx,
  );

  const pendingBagRef = useRef<RecommendationBatch | null>(null);
  pendingBagRef.current = pendingBag;

  useEffect(() => {
    if (cardCount === 0) {
      setCardIdx(0);
      return;
    }
    setCardIdx((i) => (i >= cardCount ? cardCount - 1 : i));
  }, [cardCount]);

  const mergePendingIntoFeed = useCallback(
    (batch: RecommendationBatch): boolean => {
      let merged = false;
      let nextCard = 0;
      useMarketStore.setState((state) => {
        const result = appendHomeBulksFromApiBag(state, batch);
        if (!result) return state;
        merged = true;
        nextCard = result.preferredCardIdx;
        return { ...state, ...result.patch };
      });
      if (merged) {
        setMergeSnapTransition(true);
        setCardIdx(nextCard);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setMergeSnapTransition(false));
        });
      }
      return merged;
    },
    [],
  );

  useEffect(() => {
    if (!feedUpdateClearAfterPaintRef.current) return;
    feedUpdateClearAfterPaintRef.current = false;
    const root = viewportRef.current;
    if (root) {
      root
        .querySelectorAll("[data-home-offers-scroll], [data-home-stores-scroll]")
        .forEach((node) => {
          (node as HTMLElement).scrollTop = 0;
        });
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setApplyingNextBag(false);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [recommendationHomeBulks]);

  useEffect(() => {
    const mq = globalThis.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setHomeStoresSheetOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const runMergePendingBag = useCallback(
    (batch: RecommendationBatch) => {
      feedUpdateClearAfterPaintRef.current = true;
      setApplyingNextBag(true);
      const merged = mergePendingIntoFeed(batch);
      if (!merged) {
        feedUpdateClearAfterPaintRef.current = false;
        setApplyingNextBag(false);
      }
    },
    [mergePendingIntoFeed],
  );

  const { loadNext } = useHomeFeedLoader();

  /** Prefetch / merge según posición en el carrusel (bolsas de 7 tarjetas). */
  useEffect(() => {
    if (recommendationFeedExhausted || cardCount === 0) return;

    if (
      pendingBag &&
      shouldMergePendingBag(
        cardIdx,
        recommendationBagStartBulkIdx,
        bulksInCurrentBag,
      )
    ) {
      runMergePendingBag(pendingBag);
      setPendingBag(null);
      return;
    }

    const shouldStartRecommendationFetch = shouldFetchRecommendationBag(
      cardIdx,
      recommendationBagStartBulkIdx,
      bulksInCurrentBag,
    );

    if (
      shouldStartRecommendationFetch &&
      !pendingBag &&
      !prefetchInFlightRef.current
    ) {
      prefetchInFlightRef.current = true;
      setPrefetchBusy(true);
      void loadNext(RECOMMENDATION_API_TAKE)
        .then((batch) => {
          if (!batch || batch.offerIds.length === 0) {
            useMarketStore.setState({
              recommendationFeedExhausted: true,
              recommendationTotalAvailable: 0,
            });
          } else {
            setPendingBag(batch);
          }
        })
        .catch((e) => {
          toast.error(
            e instanceof Error && e.message
              ? e.message
              : "No se pudieron cargar más recomendaciones.",
          );
        })
        .finally(() => {
          prefetchInFlightRef.current = false;
          setPrefetchBusy(false);
        });
    }
  }, [
    cardIdx,
    cardCount,
    runMergePendingBag,
    pendingBag,
    recommendationFeedExhausted,
    recommendationBagStartBulkIdx,
    bulksInCurrentBag,
    loadNext,
  ]);

  const fetchAppendRef = useRef<() => void>(() => {});
  fetchAppendRef.current = () => {
    const batch = pendingBagRef.current;
    if (!batch) return;
    runMergePendingBag(batch);
    setPendingBag(null);
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    function goByDelta(deltaY: number) {
      const cnt = cardCountRef.current;
      if (isAnimatingRef.current || cnt === 0) return;
      const dir = deltaY > 0 ? 1 : -1;
      const jump = Math.max(1, Math.min(3, Math.round(Math.abs(deltaY) / 140)));

      setCardIdx((prev) => {
        if (dir > 0) {
          const target = Math.min(cnt - 1, prev + jump);
          if (target > prev) {
            isAnimatingRef.current = true;
            globalThis.setTimeout(() => {
              isAnimatingRef.current = false;
            }, 520);
            return target;
          }
          if (prev >= cnt - 1) {
            if (pendingBagRef.current) {
              fetchAppendRef.current();
            }
            return prev;
          }
          return prev;
        }

        const target = Math.max(0, prev - jump);
        if (target < prev) {
          isAnimatingRef.current = true;
          globalThis.setTimeout(() => {
            isAnimatingRef.current = false;
          }, 520);
          return target;
        }
        return prev;
      });
    }

    let touchStartY: number | null = null;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      const t = e.target as Node | null;
      if (t && el.contains(t)) {
        const scrollable =
          t instanceof Element
            ? (t.closest(
                "[data-home-offers-scroll], [data-home-stores-scroll]",
              ) as HTMLElement | null)
            : null;
        if (scrollable) {
          const st = scrollable.scrollTop;
          const eps = 2;
          const atTop = st <= eps;
          const atBottom =
            st + scrollable.clientHeight >= scrollable.scrollHeight - eps;
          const canScrollInnerUp = !atTop && e.deltaY < 0;
          const canScrollInnerDown = !atBottom && e.deltaY > 0;
          if (canScrollInnerUp || canScrollInnerDown) {
            return;
          }
        }
      }
      e.preventDefault();
      goByDelta(e.deltaY);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartY === null) return;
      const touch = e.changedTouches[0];
      const dy = touchStartY - touch.clientY;
      touchStartY = null;
      if (Math.abs(dy) < 28) return;
      goByDelta(dy);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [cardCount]);

  const onSeventhMergeSlot =
    cardCount > 0 &&
    shouldMergePendingBag(
      cardIdx,
      recommendationBagStartBulkIdx,
      bulksInCurrentBag,
    );

  /** En la 7.ª tarjeta, sin bolsa aún: el GET sigue en curso. */
  const waitingForBagOnSeventhBulk =
    onSeventhMergeSlot && !pendingBag && prefetchBusy;

  /**
   * Cubrir el viewport en la 7.ª tarjeta con bolsa lista (antes de que el effect fusione),
   * durante la fusión y mientras espera el GET — evita ver el salto de tarjeta / scroll.
   */
  const showFeedOverlayLoader =
    cardCount > 0 &&
    (applyingNextBag ||
      waitingForBagOnSeventhBulk ||
      (onSeventhMergeSlot && pendingBag != null));

  const overlayIsUpdateOrMerge =
    applyingNextBag || (onSeventhMergeSlot && pendingBag != null);

  const showBottomPrefetchSpinner =
    prefetchBusy && cardCount > 0 && !showFeedOverlayLoader;

  const sheetStoreIds = cardCount > 0 ? displayBulks[cardIdx]?.storeIds ?? [] : [];
  const showStoresMobileFab =
    cardCount > 0 &&
    !showFeedOverlayLoader &&
    sheetStoreIds.length > 0;

  return (
    <div className="store-front-surface vt-home-page flex min-h-0 w-full flex-1 flex-col overflow-hidden overscroll-none bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto flex min-h-0 w-full max-w-[1140px] flex-1 flex-col overflow-hidden px-4 py-4 sm:py-6">
        <div
          ref={viewportRef}
          className={`${organicFeedPanelClass} relative h-[min(780px,calc(100vh-9rem))] min-h-0 w-full overflow-hidden overscroll-contain sm:h-[calc(100vh-9rem)]`}
          aria-label="Feed de ofertas por lotes"
        >
          {cardCount === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-sm text-slate-500">
                {prefetchBusy
                  ? "Cargando recomendaciones…"
                  : "No hay ofertas para mostrar."}
              </p>
            </div>
          ) : (
            <div className="relative h-full min-h-0">
              <div
                className={`h-full will-change-transform ${mergeSnapTransition ? "" : carouselEase}`}
                style={{ transform: `translateY(-${cardIdx * 100}%)` }}
              >
                {displayBulks.map((bulk, i) => {
                  const chunkItems = bulk.offerIds
                    .map((id) => offers[id])
                    .filter((o): o is Offer => o != null);
                  const slideKey =
                    bulk.instanceKey ??
                    `slide-${i}-${bulk.offerIds[0] ?? "x"}-${bulk.offerIds.length}`;
                  return (
                    <div
                      key={slideKey}
                      className="flex h-full max-h-full w-full flex-col overflow-hidden"
                    >
                      <div className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-t-[24px] p-3 sm:p-4 md:flex-row md:items-stretch md:gap-0 ${organicSlideBgClass}`}>
                        {bulk.storeIds.length > 0 ? (
                          <aside className="hidden min-h-0 w-full max-h-[min(42vh,380px)] shrink-0 flex-col border-b border-[color-mix(in_oklab,var(--organic-cream)_45%,var(--border))] pb-3 md:flex md:max-h-none md:h-auto md:w-[min(100%,300px)] md:border-b-0 md:border-r md:border-[color-mix(in_oklab,var(--organic-cream)_45%,var(--border))] md:pb-0 md:pr-3">
                            <RecommendedStoresRow
                              embedded
                              orientation="vertical"
                              storeIds={bulk.storeIds}
                              stores={stores}
                              storeCatalogs={storeCatalogs}
                            />
                          </aside>
                        ) : null}
                        <div
                          className={
                            bulk.storeIds.length > 0
                              ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:min-h-0 md:flex-1 md:pl-3 md:pt-0 pt-0"
                              : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                          }
                        >
                          <div
                            data-home-offers-scroll
                            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
                          >
                            {chunkItems.length > 0 ? (
                              <OfferCardsChunk
                                items={chunkItems}
                                routeOfferPublic={routeOfferPublic}
                              />
                            ) : (
                              <p className="py-6 text-center text-sm text-slate-500">
                                Sin ofertas en este lote.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {showFeedOverlayLoader ? (
                <div
                  className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[24px] ${organicFeedOverlayClass}`}
                  aria-busy="true"
                  aria-live="polite"
                >
                  <div className="pointer-events-auto flex flex-col items-center gap-3 px-4">
                    <CeSpinner size="lg" className="text-[var(--organic-emerald)]" aria-label={overlayIsUpdateOrMerge ? "Actualizando el feed…" : "Descargando el siguiente bloque…"} />
                    <span className="text-sm font-semibold text-[var(--muted)]">{overlayIsUpdateOrMerge ? "Actualizando el feed…" : "Descargando el siguiente bloque…"}</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <HomeStoresMobileSheet
          open={homeStoresSheetOpen}
          onOpenChange={setHomeStoresSheetOpen}
          showFab={showStoresMobileFab}
          storeIds={sheetStoreIds}
          stores={stores}
          storeCatalogs={storeCatalogs}
        />

        {showBottomPrefetchSpinner ? (
          <div className="mt-3 flex w-full flex-col items-center gap-2 py-4">
            <CeSpinner size="md" className="text-[var(--organic-emerald)]" aria-label="Cargando más sugerencias…" />
            <span className="text-sm font-semibold text-[var(--muted)]">Cargando más sugerencias…</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
