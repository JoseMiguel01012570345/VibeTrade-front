import { Link } from "react-router-dom";
import { ExternalLink, MapPin, Package, Store, Wrench } from "lucide-react";
import { websiteUrlDisplayLabel } from "@shared/lib/websiteUrl";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import { storeHref } from "@features/market/logic/store/storePath";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { StoreTrustMini } from "@features/profile/components/trust/StoreTrustMini";
import { fmtKm } from "@features/home/logic/formatDistance";
import { PointLocationFeedMap } from "./EmergentRouteFeedMap";

type Props = Readonly<{
  store: StoreBadge;
  publishedProducts: number;
  publishedServices: number;
  distanceKm?: number | null;
}>;

export function StoreSearchResultCard({
  store: s,
  publishedProducts,
  publishedServices,
  distanceKm,
}: Props) {
  const hasMap = s.location != null;

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
      <Link
        to={storeHref(s)}
        className="absolute inset-0 z-[1] rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        aria-label={`Abrir tienda ${s.name}`}
      />

      {hasMap ? (
        <div className="relative h-32 w-full overflow-hidden border-b border-[var(--border)]">
          <PointLocationFeedMap
            location={s.location!}
            mapKey={`search-card-map-${s.id}`}
            fixedZoom={14}
            showAttribution={false}
            className="h-full w-full [&_.leaflet-control-zoom]:hidden [&_.leaflet-control-attribution]:hidden"
          />
        </div>
      ) : null}

      <div className="relative z-[2] p-3 pointer-events-none">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)]">
            {s.avatarUrl ? (
              <ProtectedMediaImg
                src={s.avatarUrl}
                alt=""
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover"
              />
            ) : (
              <Store size={18} className="text-[var(--muted)]" aria-hidden />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 break-words text-sm font-black leading-snug tracking-[-0.02em]">
              {s.name}
            </div>
            {s.categories.length > 0 ? (
              <div className="vt-muted mt-0.5 truncate text-[11px] leading-snug">
                {s.categories.join(" · ")}
              </div>
            ) : null}
          </div>
        </div>

        <div className="vt-muted mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className="inline-flex items-center gap-1">
            <Package size={11} aria-hidden /> {publishedProducts}
          </span>
          {publishedServices > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Wrench size={11} aria-hidden /> {publishedServices}
            </span>
          ) : null}
          {typeof distanceKm === "number" ? (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} aria-hidden /> {fmtKm(distanceKm)}
            </span>
          ) : null}
          {s.websiteUrl ? (
            <a
              href={s.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto inline-flex max-w-full items-center gap-1 truncate font-semibold text-[var(--primary)] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={11} className="shrink-0" aria-hidden />
              <span className="truncate">{websiteUrlDisplayLabel(s.websiteUrl)}</span>
            </a>
          ) : null}
        </div>

        <div className="mt-2">
          <StoreTrustMini score={s.trustScore} />
        </div>
      </div>
    </div>
  );
}

