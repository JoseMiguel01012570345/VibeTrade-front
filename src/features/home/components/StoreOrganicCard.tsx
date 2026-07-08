import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  MapPin,
  MapPinOff,
  Package,
  Store,
  Wrench,
} from "lucide-react";
import { cn } from "@shared/lib/cn";
import { websiteUrlDisplayLabel } from "@shared/lib/websiteUrl";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import { storeHref } from "@features/market/logic/store/storePath";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { StoreTrustMini } from "@features/profile/components/trust/StoreTrustMini";
import { StoreLocationMiniMap } from "@features/market/components/StoreLocationMiniMap";
import { fmtKm } from "@features/home/logic/formatDistance";
import { storeOrganicCardClass } from "@shared/styles/organicCardStyles";
import {
  isValidStoreLocation,
  storeCategoriesLabel,
} from "../logic/homeTextUtils";

function StoreLocationBlock({
  store,
  tall,
}: Readonly<{
  store: StoreBadge;
  tall?: boolean;
}>) {
  const sizeClass = tall
    ? "vt-organic-store-location--tall"
    : "vt-organic-store-location--compact";

  if (isValidStoreLocation(store.location)) {
    return (
      <div
        className={cn("vt-organic-store-location", sizeClass)}
        aria-label="Ubicación de la tienda en mapa"
      >
        <StoreLocationMiniMap
          location={store.location}
          mapKey={`${store.id}-${store.location.lat}-${store.location.lng}`}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("vt-organic-store-location--empty", sizeClass)}
      role="img"
      aria-label="La tienda no tiene ubicación registrada"
    >
      <MapPinOff
        size={tall ? 22 : 18}
        className="vt-organic-store-location--empty-icon shrink-0"
        aria-hidden
      />
      <span className="text-[10px] font-bold uppercase tracking-wide">
        Sin ubicación
      </span>
    </div>
  );
}

type Props = Readonly<{
  store: StoreBadge;
  /** `feed` sidebar/carril; `search` resultados de catálogo. */
  variant?: "feed" | "search";
  publishedProducts?: number;
  publishedServices?: number;
  distanceKm?: number | null;
  description?: string;
  descriptionTitle?: string;
  className?: string;
  /** Enlace absoluto encima (búsqueda); si false, la tarjeta es clickeable entera. */
  overlayLink?: boolean;
  onNavigate?: () => void;
  footer?: ReactNode;
}>;

export function StoreOrganicCard({
  store: s,
  variant = "feed",
  publishedProducts,
  publishedServices,
  distanceKm,
  description,
  descriptionTitle,
  className,
  overlayLink = false,
  onNavigate,
  footer,
}: Props) {
  const tallLocation = variant === "search";
  const showStats =
    variant === "search" &&
    (publishedProducts != null ||
      publishedServices != null ||
      typeof distanceKm === "number");

  const body = (
    <>
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="vt-organic-store-avatar">
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
          <div className="line-clamp-2 text-sm font-black leading-tight tracking-[-0.02em] text-[var(--text)]">
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

      <StoreLocationBlock store={s} tall={tallLocation} />

      {showStats ? (
        <div className="vt-organic-store-stats">
          {publishedProducts != null ? (
            <span className="inline-flex items-center gap-1">
              <Package size={11} aria-hidden /> {publishedProducts} productos
            </span>
          ) : null}
          {publishedServices != null && publishedServices > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Wrench size={11} aria-hidden /> {publishedServices} servicios
            </span>
          ) : null}
          {typeof distanceKm === "number" ? (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} aria-hidden /> {fmtKm(distanceKm)}
            </span>
          ) : null}
        </div>
      ) : null}

      {description ? (
        <p
          className="line-clamp-2 min-h-0 break-words text-[11px] leading-snug text-[var(--muted)]"
          title={descriptionTitle}
        >
          {description}
        </p>
      ) : null}

      {footer}
    </>
  );

  if (overlayLink) {
    return (
      <div className={cn(storeOrganicCardClass, "cursor-pointer", className)}>
        <Link
          to={storeHref(s)}
          className="absolute inset-0 z-[1] rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          aria-label={`Abrir tienda ${s.name}`}
        />
        <div className="relative z-[2] flex flex-col gap-2.5 pointer-events-none">
          {body}
        </div>
      </div>
    );
  }

  return (
    <div
      role="link"
      tabIndex={0}
      className={cn(storeOrganicCardClass, "cursor-pointer", className)}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate?.();
        }
      }}
    >
      {body}
    </div>
  );
}
