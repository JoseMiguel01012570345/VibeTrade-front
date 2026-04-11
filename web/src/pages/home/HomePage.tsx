import { useMemo } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";
import type { Offer, StoreBadge } from "../../app/store/useMarketStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { RouteOfferPreview } from "../offer/RouteOfferPreview";
import { OfferSaveButton } from "../offer/OfferSaveButton";
import {
  isToolPlaceholderUrl,
  TOOL_PLACEHOLDER_SRC,
} from "../../utils/market/toolPlaceholder";

function OffersTab({
  items,
  stores,
  routeOfferPublic,
}: Readonly<{
  items: Offer[];
  stores: Record<string, StoreBadge>;
  routeOfferPublic: Record<string, unknown>;
}>) {
  return (
    <div className="grid grid-cols-12 gap-3.5">
      {items.map((o) => {
        const store = stores[o.storeId];
        const routePreview = routeOfferPublic[o.id] as any;
        const thumbSrc =
          o.imageUrl?.trim() ||
          (o.tags.includes("Servicio") ? TOOL_PLACEHOLDER_SRC : undefined);
        const isToolPlaceholder = isToolPlaceholderUrl(thumbSrc);
        return (
          <div
            key={o.id}
            className="vt-card col-span-12 overflow-hidden min-[860px]:col-span-6"
          >
            <div className="relative h-[190px] overflow-hidden bg-gray-200">
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
                  wrapperClassName="block h-full w-full min-h-[190px]"
                  className={cn(
                    "block h-full w-full min-h-[190px] transition-transform duration-[240ms] ease-out",
                    isToolPlaceholder
                      ? "vt-img-tool-placeholder bg-gray-200 p-4 sm:p-5"
                      : "scale-[1.02] object-cover group-hover:scale-[1.06]",
                  )}
                />
              </Link>
              <div className="pointer-events-auto absolute right-2 top-2 z-[2]">
                <OfferSaveButton offerId={o.id} />
              </div>
            </div>

            <div className="flex flex-col gap-2.5 p-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-black tracking-[-0.02em]">
                  <Link to={`/offer/${o.id}`}>{o.title}</Link>
                </div>
                <div className="shrink-0 font-black text-[var(--text)]">
                  {o.price}
                </div>
              </div>

              {o.description?.trim() ? (
                <p className="vt-muted line-clamp-2 text-[13px] leading-snug">
                  {o.description.trim()}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2.5">
                <Link
                  to={`/store/${store.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2.5 py-1.5 text-xs font-extrabold text-[var(--text)]"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                  {store.name}
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {o.tags.map((t) => (
                  <span key={t} className="vt-pill">
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

// StoresTab moved to /stores route (StoresSearchPage).

export function HomePage() {
  const offerIds = useMarketStore((s) => s.offerIds);
  const offers = useMarketStore((s) => s.offers);
  const stores = useMarketStore((s) => s.stores);
  const routeOfferPublic = useMarketStore((s) => s.routeOfferPublic);

  const items = useMemo((): Offer[] => {
    return offerIds
      .map((id) => offers[id])
      .filter((o): o is Offer => o != null);
  }, [offerIds, offers]);

  return (
    <div className="container vt-page">
      <div className="mb-3 mt-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="vt-h1">Ofertas</h1>
          <div className="vt-muted">
            Explorá ofertas publicadas en la plataforma.
          </div>
        </div>
        <Link className="vt-btn" to="/stores">
          Ver tiendas
        </Link>
      </div>

      <OffersTab
        items={items}
        stores={stores}
        routeOfferPublic={routeOfferPublic}
      />
    </div>
  );
}
