import { useEffect } from "react";
import { Store as StoreLucideIcon, X } from "lucide-react";
import { cn } from "@shared/lib/cn";
import type { StoreCatalog } from "@features/market/logic/storeCatalogTypes";
import type { StoreBadge } from "@features/market/logic/store/useMarketStore";
import {
  backdropTransitionClasses,
  panelTransitionClasses,
} from "@shared/components/ui/ceModalTransitionTheme";
import { useModalTransition } from "@shared/components/ui/useModalTransition";
import {
  organicFabClass,
  organicHomeGlassBackdropClass,
  organicHomeGlassSheetClass,
  organicSheetClass,
} from "@shared/styles/organicCardStyles";
import { RecommendedStoresRow } from "./RecommendedStoresRow";

const SHEET_PANEL_TRANSITION =
  "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

const FAB_TRANSITION =
  "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

type Props = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showFab: boolean;
  storeIds: string[];
  stores: Record<string, StoreBadge>;
  storeCatalogs: Record<string, StoreCatalog>;
  glass?: boolean;
}>;

export function HomeStoresMobileSheet({
  open,
  onOpenChange,
  showFab,
  storeIds,
  stores,
  storeCatalogs,
  glass = false,
}: Props) {
  const { displayed, animateIn } = useModalTransition(open);

  useEffect(() => {
    if (!displayed) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [displayed]);

  useEffect(() => {
    if (!displayed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [displayed, onOpenChange]);

  if (!showFab && !displayed) return null;

  return (
    <>
      {showFab ? (
        <button
          type="button"
          className={cn(
            organicFabClass,
            FAB_TRANSITION,
            "fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] right-4 z-[61] md:hidden focus-visible:outline-none active:translate-y-[0.5px]",
            open
              ? "pointer-events-none scale-90 opacity-0"
              : "scale-100 opacity-100",
          )}
          aria-label={`Tiendas sugeridas en este lote (${storeIds.length})`}
          aria-expanded={open}
          onClick={() => onOpenChange(true)}
        >
          <StoreLucideIcon
            strokeWidth={2.35}
            className="h-7 w-7 shrink-0 text-current"
            aria-hidden
          />
        </button>
      ) : null}

      {displayed ? (
        <div
          className="fixed inset-0 z-[92] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vt-home-stores-sheet-title"
        >
          <button
            type="button"
            className={cn(
              "absolute inset-0 bg-[rgba(2,6,23,0.55)] backdrop-blur-[3px] transition-opacity duration-300 ease-out motion-reduce:transition-none",
              glass && organicHomeGlassBackdropClass,
              backdropTransitionClasses(animateIn),
            )}
            aria-label="Cerrar tiendas recomendadas"
            onClick={() => onOpenChange(false)}
          />
          <div
            className={cn(
              organicSheetClass,
              glass && organicHomeGlassSheetClass,
              SHEET_PANEL_TRANSITION,
              panelTransitionClasses(animateIn, true),
              "absolute bottom-0 left-0 right-0 flex max-h-[min(82dvh,720px)] min-h-[40%] flex-col rounded-t-[18px] shadow-[0_12px_30px_rgba(33,37,41,0.08)]",
            )}
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-[color-mix(in_oklab,var(--organic-cream)_45%,var(--border))] px-4 py-3 pr-2">
              <div className="min-w-0 flex-1">
                <p
                  id="vt-home-stores-sheet-title"
                  className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-[var(--text)]"
                >
                  Tiendas para ti
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                  {storeIds.length}{" "}
                  {storeIds.length === 1 ? "tienda" : "tiendas"} recomendadas en
                  este lote
                </p>
              </div>
              <button
                type="button"
                className="vt-btn shrink-0"
                aria-label="Cerrar panel de tiendas"
                onClick={() => onOpenChange(false)}
              >
                <X size={18} aria-hidden />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-[max(14px,calc(env(safe-area-inset-bottom,0px)+12px))] pt-2">
              <RecommendedStoresRow
                embedded
                hideTitle
                orientation="vertical"
                storeIds={storeIds}
                stores={stores}
                storeCatalogs={storeCatalogs}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
