import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@shared/lib/cn";
import type { StoreCatalog } from "@features/market/logic/storeCatalogTypes";
import type { StoreBadge } from "@features/market/logic/store/useMarketStore";
import { storeHref } from "@features/market/logic/store/storePath";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StoreOrganicCard } from "./StoreOrganicCard";
import { storeDescriptionSnippet } from "../logic/homeTextUtils";
import { organicIconBtnClass } from "@shared/styles/organicCardStyles";

/** Carril de tiendas sugeridas: horizontal (flechas) o vertical (sidebar en home). */
export function RecommendedStoresRow({
  storeIds,
  stores,
  storeCatalogs,
  embedded,
  orientation = "horizontal",
  hideTitle = false,
}: Readonly<{
  storeIds: string[];
  stores: Record<string, StoreBadge>;
  storeCatalogs: Record<string, StoreCatalog>;
  /** Dentro del feed intercalado (menos margen vertical). */
  embedded?: boolean;
  orientation?: "horizontal" | "vertical";
  /** Por ejemplo panels con header propio (sheet home móvil). */
  hideTitle?: boolean;
}>) {
  const navigate = useNavigate();
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

  const arrowBtn = organicIconBtnClass;

  const titleClass = cn(
    "shrink-0 font-extrabold uppercase tracking-[0.08em] text-[var(--muted)]",
    embedded ? "mb-1.5 text-[10px]" : "mb-2 text-[11px]",
  );

  const storeCard = (s: StoreBadge) => {
    const cat = storeCatalogs[s.id];
    const desc = storeDescriptionSnippet(s.pitch, cat?.pitch);
    const fullDesc = (s.pitch ?? cat?.pitch ?? "").trim();
    return (
      <div
        key={s.id}
        role="listitem"
        className={cn(
          "min-w-0",
          orientation === "vertical" ? "w-full" : "w-[min(300px,88vw)] shrink-0",
        )}
      >
        <StoreOrganicCard
          store={s}
          variant="feed"
          description={desc || undefined}
          descriptionTitle={fullDesc.length > desc.length ? fullDesc : undefined}
          onNavigate={() => navigate(storeHref(s))}
        />
      </div>
    );
  };

  if (orientation === "vertical") {
    return (
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          embedded ? "" : "mb-4",
        )}
      >
        {!hideTitle ? (
          <p className={titleClass}>Tiendas para vos</p>
        ) : null}
        <div
          ref={scrollerRef}
          data-home-stores-scroll
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-ms-overflow-style:none] [scrollbar-width:thin] [scrollbar-color:color-mix(in_oklab,var(--muted)_35%,transparent)_transparent] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color-mix(in_oklab,var(--muted)_30%,transparent)]"
          role="list"
          aria-label="Tiendas recomendadas"
        >
          <div className="flex flex-col gap-3 pb-2 pr-0.5 pt-0.5">
            {resolved.map((s) => storeCard(s))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", embedded ? "mb-3 md:mb-3.5" : "mb-4")}>
      <p className={titleClass}>Tiendas para vos</p>
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
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
          <div className="flex w-max items-center gap-3 pl-0.5 pr-4">
            {resolved.map((s) => storeCard(s))}
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
