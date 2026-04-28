import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";
import type {
  MarketState,
  Offer,
  StoreBadge,
} from "../../app/store/useMarketStore";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import type { RecommendationBatch } from "../../utils/bootstrap/bootstrapTypes";
import { fetchRecommendationPage } from "../../utils/recommendations/recommendationsApi";
import {
  RECOMMENDATION_API_TAKE,
  appendHomeBulksFromApiBag,
  shouldMergePendingBag,
  shouldPrefetchNextBag,
} from "./homeFeedMerge";
import { Store as StoreLucideIcon, X } from "lucide-react";
import { FeedLoadingSpinner } from "./FeedLoadingSpinner";
import { OfferCardsChunk } from "./OfferCardsChunk";
import { RecommendedStoresRow } from "./RecommendedStoresRow";

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
    if (!homeStoresSheetOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [homeStoresSheetOpen]);

  useEffect(() => {
    const mq = globalThis.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setHomeStoresSheetOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!homeStoresSheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHomeStoresSheetOpen(false);
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [homeStoresSheetOpen]);

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

    /** 5.ª tarjeta (anticipado) o 7.ª si aún no hay bolsa (p. ej. saltó la 5.ª). */
    const shouldStartRecommendationFetch =
      shouldPrefetchNextBag(
        cardIdx,
        recommendationBagStartBulkIdx,
        bulksInCurrentBag,
      ) ||
      shouldMergePendingBag(
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
      void fetchRecommendationPage(RECOMMENDATION_API_TAKE)
        .then((batch) => {
          if (batch.offerIds.length === 0) {
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
    <div className="vt-home-page flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none">
      <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-hidden pb-3 pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))] pt-1">
        <div
          ref={viewportRef}
          className="relative h-[min(780px,calc(100vh-9rem))] min-h-0 w-full max-w-[1100px] overflow-hidden overscroll-contain rounded-xl border border-[var(--border)] bg-[var(--bg)] sm:h-[calc(100vh-9rem)]"
          aria-label="Feed de ofertas por lotes"
        >
          {cardCount === 0 ? (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-sm text-[var(--muted)]">
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
                      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-t-xl bg-[var(--bg)] p-3 sm:p-4 md:flex-row md:items-stretch md:gap-0">
                        {bulk.storeIds.length > 0 ? (
                          <aside className="hidden min-h-0 w-full max-h-[min(42vh,380px)] shrink-0 flex-col border-b border-[var(--border)] pb-3 md:flex md:max-h-none md:h-auto md:w-[min(100%,300px)] md:border-b-0 md:border-r md:border-[var(--border)] md:pb-0 md:pr-3">
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
                                stores={stores}
                                routeOfferPublic={routeOfferPublic}
                              />
                            ) : (
                              <p className="py-6 text-center text-sm text-[var(--muted)]">
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
                  className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--bg)]/85 backdrop-blur-[2px]"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <div className="pointer-events-auto px-4">
                    <FeedLoadingSpinner
                      label={
                        overlayIsUpdateOrMerge
                          ? "Actualizando el feed…"
                          : "Descargando el siguiente bloque…"
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {showStoresMobileFab ? (
          <>
            {!homeStoresSheetOpen ? (
              <button
                type="button"
                className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] right-4 z-[61] flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_oklab,var(--primary)_78%,var(--border))] bg-[var(--primary)] text-white shadow-[0_10px_28px_rgba(37,99,235,0.38)] md:hidden hover:bg-[var(--primary-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] active:translate-y-[0.5px]"
                aria-label={`Tiendas sugeridas en este lote (${sheetStoreIds.length})`}
                onClick={() => setHomeStoresSheetOpen(true)}
              >
                <StoreLucideIcon
                  strokeWidth={2.25}
                  className="h-7 w-7"
                  aria-hidden
                />
              </button>
            ) : null}

            {homeStoresSheetOpen ? (
              <div
                className="fixed inset-0 z-[92] md:hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="vt-home-stores-sheet-title"
              >
                <button
                  type="button"
                  className="absolute inset-0 bg-[rgba(2,6,23,0.55)] backdrop-blur-[3px]"
                  aria-label="Cerrar tiendas recomendadas"
                  onClick={() => setHomeStoresSheetOpen(false)}
                />
                <div className="absolute bottom-0 left-0 right-0 flex max-h-[min(82dvh,720px)] min-h-[40%] flex-col rounded-t-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
                  <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] px-4 py-3 pr-2">
                    <div className="min-w-0 flex-1">
                      <p
                        id="vt-home-stores-sheet-title"
                        className="truncate text-[15px] font-extrabold tracking-[-0.02em]"
                      >
                        Tiendas para vos
                      </p>
                      <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                        {sheetStoreIds.length}{" "}
                        {sheetStoreIds.length === 1 ? "tienda" : "tiendas"}{" "}
                        recomendadas en este lote
                      </p>
                    </div>
                    <button
                      type="button"
                      className="vt-btn shrink-0"
                      aria-label="Cerrar panel de tiendas"
                      onClick={() => setHomeStoresSheetOpen(false)}
                    >
                      <X size={18} aria-hidden />
                    </button>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-[max(14px,calc(env(safe-area-inset-bottom,0px)+12px))] pt-2">
                    <RecommendedStoresRow
                      embedded
                      hideTitle
                      orientation="vertical"
                      storeIds={sheetStoreIds}
                      stores={stores}
                      storeCatalogs={storeCatalogs}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {showBottomPrefetchSpinner ? (
          <div className="mt-3 w-full max-w-[1100px]">
            <FeedLoadingSpinner label="Cargando más sugerencias…" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
