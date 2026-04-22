import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/cn";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";
import { StoreTrustMini } from "../../components/StoreTrustMini";
import { StoreLocationMiniMap } from "../../components/store/StoreLocationMiniMap";
import type { StoreCatalog } from "../chat/domain/storeCatalogTypes";
import type { StoreBadge } from "../../app/store/useMarketStore";
import { ChevronLeft, ChevronRight, ExternalLink, Store } from "lucide-react";
import { websiteUrlDisplayLabel } from "../../utils/websiteUrl";
import {
  isValidStoreLocation,
  storeCategoriesLabel,
  storeDescriptionSnippet,
} from "./homeTextUtils";

/** Carril de tiendas sugeridas: horizontal (flechas) o vertical (sidebar en home). */
export function RecommendedStoresRow({
  storeIds,
  stores,
  storeCatalogs,
  embedded,
  orientation = "horizontal",
}: Readonly<{
  storeIds: string[];
  stores: Record<string, StoreBadge>;
  storeCatalogs: Record<string, StoreCatalog>;
  /** Dentro del feed intercalado (menos margen vertical). */
  embedded?: boolean;
  orientation?: "horizontal" | "vertical";
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

  const arrowBtn =
    "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[var(--text)] shadow-sm transition-[opacity,colors] hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-35";

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
        <div
          role="link"
          tabIndex={0}
          className="vt-card flex w-full cursor-pointer flex-col gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-left transition-colors hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          onClick={() => navigate(`/store/${s.id}`)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate(`/store/${s.id}`);
            }
          }}
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
              {s.websiteUrl ? (
                <a
                  href={s.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto mt-1 inline-flex max-w-full items-center gap-1 truncate text-[11px] font-bold text-[var(--primary)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={12} className="shrink-0" aria-hidden />
                  <span className="truncate">
                    {websiteUrlDisplayLabel(s.websiteUrl)}
                  </span>
                </a>
              ) : null}
            </div>
          </div>
          <StoreTrustMini score={s.trustScore} className="max-w-full" />
          {isValidStoreLocation(s.location) ? (
            <div
              className={cn(
                "w-full overflow-hidden rounded-lg self-start",
                orientation === "vertical" ? "max-w-full" : "max-w-[220px]",
              )}
            >
              <StoreLocationMiniMap
                location={s.location}
                mapKey={`${s.id}-${s.location.lat}-${s.location.lng}`}
              />
            </div>
          ) : (
            <div
              className={cn(
                "flex h-[88px] items-center justify-center self-start rounded-lg border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_70%,var(--surface))] px-2 text-center text-[10px] font-semibold leading-tight text-[var(--muted)]",
                orientation === "vertical" ? "w-full" : "w-full max-w-[220px]",
              )}
            >
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
        </div>
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
        <p className={titleClass}>Tiendas para vos</p>
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
