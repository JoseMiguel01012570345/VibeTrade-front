import { Link } from "react-router-dom";
import { ExternalLink, MapPin, Package, Store, Wrench } from "lucide-react";
import { websiteUrlDisplayLabel } from "../../utils/websiteUrl";
import type { StoreBadge } from "../../app/store/marketStoreTypes";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";
import { StoreTrustMini } from "../../components/StoreTrustMini";

type Props = Readonly<{
  store: StoreBadge;
  publishedProducts: number;
  publishedServices: number;
  distanceKm?: number | null;
}>;

function fmtKm(v: number): string {
  if (v < 1) return `${Math.round(v * 1000)} m`;
  if (v < 10) return `${v.toFixed(1)} km`;
  return `${Math.round(v)} km`;
}

export function StoreSearchResultCard({
  store: s,
  publishedProducts,
  publishedServices,
  distanceKm,
}: Props) {
  return (
    <div className="relative min-w-0 max-w-full overflow-hidden rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))]">
      <Link
        to={`/store/${s.id}/vitrina`}
        className="absolute inset-0 z-[1] rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        aria-label={`Abrir tienda ${s.name}`}
      />

      <div className="relative z-[2] p-3.5 pointer-events-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
              {s.avatarUrl ? (
                <ProtectedMediaImg
                  src={s.avatarUrl}
                  alt=""
                  wrapperClassName="h-full w-full"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store size={22} className="text-[var(--muted)]" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <div className="line-clamp-2 break-words text-base font-black tracking-[-0.02em]">
                {s.name}
              </div>
              <div className="vt-muted mt-1 line-clamp-2 break-words text-xs leading-snug">
                {s.categories.join(" · ")}
              </div>
              {s.websiteUrl ? (
                <a
                  href={s.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold text-[var(--primary)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={12} className="shrink-0" aria-hidden />
                  <span className="truncate">
                    {websiteUrlDisplayLabel(s.websiteUrl)}
                  </span>
                </a>
              ) : null}

              <div className="vt-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1">
                  <Package size={12} aria-hidden /> {publishedProducts}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Wrench size={12} aria-hidden /> {publishedServices}
                </span>
                {typeof distanceKm === "number" ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} aria-hidden /> {fmtKm(distanceKm)}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 max-w-[300px]">
                <StoreTrustMini score={s.trustScore} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

