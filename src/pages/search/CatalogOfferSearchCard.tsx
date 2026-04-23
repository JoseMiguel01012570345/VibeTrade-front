import { Link } from "react-router-dom";
import { ExternalLink, Package, Store, Wrench } from "lucide-react";
import type { Offer } from "../../app/store/useMarketStore";
import type {
  CatalogOfferPreview,
  CatalogSearchItem,
} from "../../utils/market/searchStores";
import { websiteUrlDisplayLabel } from "../../utils/websiteUrl";
import { StoreTrustMini } from "../../components/StoreTrustMini";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";
import { cn } from "../../lib/cn";
import {
  isToolPlaceholderUrl,
  TOOL_PLACEHOLDER_SRC,
} from "../../utils/market/toolPlaceholder";
import { buildEmergentMapLegs } from "../../utils/map/emergentRouteMapLegs";
import { EmergentRouteFeedMap } from "../home/EmergentRouteFeedMap";

type Props = Readonly<{
  item: CatalogSearchItem;
}>;

function fmtKm(v: number): string {
  if (v < 1) return `${Math.round(v * 1000)} m`;
  if (v < 10) return `${v.toFixed(1)} km`;
  return `${Math.round(v)} km`;
}

function offerTitle(offer: CatalogOfferPreview): string {
  if (offer.kind === "emergent")
    return offer.name?.trim() || offer.category || "Hoja de ruta";
  if (offer.kind === "product")
    return offer.name?.trim() || offer.category || "Producto";
  return offer.tipoServicio?.trim() || offer.category || "Servicio";
}

function offerSubtitle(offer: CatalogOfferPreview): string | null {
  if (offer.kind === "emergent") {
    const bits = [offer.category].filter(Boolean);
    return bits.length ? bits.join(" · ") : "Publicación de hoja de ruta";
  }
  if (offer.kind === "product") {
    const priceText =
      offer.price && offer.currency
        ? `${offer.price} ${offer.currency}`
        : offer.price || null;
    const currencyText =
      !priceText && offer.currency ? `Moneda: ${offer.currency}` : null;
    const bits = [offer.category, priceText ?? currencyText].filter(Boolean);
    return bits.length ? bits.join(" · ") : null;
  }
  const bits = [offer.category].filter(Boolean);
  return bits.length ? bits.join(" · ") : null;
}

function emergentOfferForMap(
  preview: CatalogOfferPreview,
  storeId: string,
): Offer {
  return {
    id: preview.id,
    storeId,
    title: preview.name?.trim() || "Hoja de ruta",
    price: preview.price?.trim() || "—",
    tags: ["Hoja de ruta (publicada)"],
    imageUrl: preview.photoUrls?.[0]?.trim() || "",
    isEmergentRoutePublication: true,
    emergentRouteParadas: preview.emergentRouteParadas,
  };
}

export function CatalogOfferSearchCard({ item }: Props) {
  const { store: s, offer, distanceKm } = item;
  if (!offer) return null;

  if (offer.kind === "emergent") {
    const title = offerTitle(offer);
    const sub = offerSubtitle(offer);
    const desc = offer.shortDescription?.trim() ?? "";
    const price = offer.price?.trim() || "—";
    const mapLegs = buildEmergentMapLegs(emergentOfferForMap(offer, s.id), undefined);

    return (
      <div className="vt-card min-w-0 overflow-hidden">
        <div className="relative h-[150px] overflow-hidden bg-gray-200 lg:h-[132px]">
          <Link
            to={`/offer/${offer.id}`}
            className={cn(
              "block h-full overflow-hidden group",
            )}
          >
            <div
              className={cn(
                "flex h-full min-h-[150px] w-full flex-col overflow-hidden transition-transform duration-[240ms] ease-out will-change-transform lg:min-h-[132px]",
                "group-hover:scale-[1.03]",
              )}
            >
              <div className="shrink-0 border-b border-slate-200/80 bg-[#eef2f7] py-1.5 text-center text-[11px] font-black tracking-wide text-slate-800 lg:text-[10px]">
                Hoja de ruta
              </div>
              <EmergentRouteFeedMap
                legs={mapLegs}
                mapKey={`search-map-${offer.id}`}
                className="relative z-0 min-h-0 flex-1 overflow-hidden bg-[#e2e8f0] [&_.leaflet-control-attribution]:text-[7px] [&_.leaflet-control-attribution]:opacity-80"
              />
            </div>
          </Link>
        </div>

        <div className="flex flex-col gap-2 p-3 lg:gap-2 lg:p-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 font-black tracking-[-0.02em] text-[15px] leading-tight lg:text-sm">
              <Link
                to={`/offer/${offer.id}`}
                className="line-clamp-2 text-[var(--text)] hover:underline"
              >
                {title}
              </Link>
            </div>
            <div className="shrink-0 font-black text-[var(--text)] text-sm lg:text-xs">
              {price}
            </div>
          </div>

          {sub ? (
            <p className="text-[12px] font-semibold leading-snug text-slate-600 lg:text-[11px]">
              {sub}
            </p>
          ) : null}

          {desc ? (
            <p
              className="vt-muted line-clamp-2 min-w-0 break-words text-[11px] leading-snug lg:text-[10px]"
              title={desc.length > 120 ? desc : undefined}
            >
              {desc}
            </p>
          ) : null}

          <div className="vt-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] lg:text-[10px]">
            <span className="font-semibold text-[var(--text)]">Tipo:</span>
            <span>Hoja de ruta publicada</span>
          </div>

          <div className="flex flex-col items-end gap-1 border-t border-[var(--border)] pt-2">
            <Link
              to={`/store/${s.id}`}
              className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2 py-1 text-[11px] font-extrabold text-[var(--text)] lg:px-1.5 lg:text-[10px]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
              <span className="truncate">{s.name}</span>
            </Link>
            {s.websiteUrl?.trim() ? (
              <a
                href={s.websiteUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 truncate text-[10px] font-bold text-[var(--primary)] hover:underline"
              >
                <ExternalLink size={12} className="shrink-0" aria-hidden />
                <span className="truncate">
                  {websiteUrlDisplayLabel(s.websiteUrl.trim())}
                </span>
              </a>
            ) : null}
            {typeof distanceKm === "number" ? (
              <span className="text-[10px] text-[var(--muted)]">{fmtKm(distanceKm)}</span>
            ) : null}
          </div>

          <div className="max-w-full">
            <StoreTrustMini score={s.trustScore} />
          </div>
        </div>
      </div>
    );
  }

  const title = offerTitle(offer);
  const sub = offerSubtitle(offer);
  const desc =
    offer.kind === "product" ? offer.shortDescription : offer.descripcion;
  const accepted = offer.acceptedCurrencies ?? [];
  const photos = (offer.photoUrls ?? []).map((x) => x.trim()).filter(Boolean);
  const mainPhoto = photos[0] || "";
  const thumbPhotos = photos.slice(1, 4);
  const mainSrc = mainPhoto || TOOL_PLACEHOLDER_SRC;
  const isTool = isToolPlaceholderUrl(mainSrc);

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))]">
      <Link
        to={`/offer/${offer.id}`}
        className="absolute inset-0 z-[1] rounded-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        aria-label={`Abrir oferta ${title}`}
      />

      <div className="relative z-[2] p-3.5 pointer-events-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="shrink-0">
              <div
                className={cn(
                  "relative h-[92px] w-[92px] overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]",
                  isTool && "bg-gray-200",
                )}
              >
                {mainPhoto ? (
                  <ProtectedMediaImg
                    src={mainSrc}
                    alt=""
                    wrapperClassName="h-full w-full"
                    className={cn(
                      "h-full w-full",
                      isTool
                        ? "vt-img-tool-placeholder p-3"
                        : "object-cover",
                    )}
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    {offer.kind === "product" ? (
                      <Package
                        size={22}
                        className="text-[var(--muted)]"
                        aria-hidden
                      />
                    ) : (
                      <Wrench
                        size={22}
                        className="text-[var(--muted)]"
                        aria-hidden
                      />
                    )}
                  </div>
                )}
              </div>
              {thumbPhotos.length ? (
                <div className="mt-2 flex gap-1.5">
                  {thumbPhotos.map((src, i) => {
                    const s0 = src || TOOL_PLACEHOLDER_SRC;
                    const tool = isToolPlaceholderUrl(s0);
                    return (
                      <div
                        key={`${src}-${i}`}
                        className={cn(
                          "h-7 w-7 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]",
                          tool && "bg-gray-200",
                        )}
                      >
                        <ProtectedMediaImg
                          src={s0}
                          alt=""
                          wrapperClassName="h-full w-full"
                          className={cn(
                            "h-full w-full",
                            tool
                              ? "vt-img-tool-placeholder p-1"
                              : "object-cover",
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-black tracking-[-0.02em]">
                {title}
              </div>
              {sub ? (
                <div className="vt-muted mt-1 truncate text-xs">{sub}</div>
              ) : null}
              {desc ? (
                <div className="vt-muted mt-2 line-clamp-2 text-xs">{desc}</div>
              ) : null}

              <div className="vt-muted mt-2 flex flex-col gap-1 text-xs">
                {offer.kind === "product" ? (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold text-[var(--text)]">
                      Moneda:
                    </span>
                    <span>{offer.currency?.trim() || "—"}</span>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-[var(--text)]">
                    Acepta:
                  </span>
                  {accepted.length ? (
                    <span className="truncate">
                      {accepted.slice(0, 6).join(", ")}
                      {accepted.length > 6 ? "…" : ""}
                    </span>
                  ) : (
                    <span>—</span>
                  )}
                </div>
              </div>

              <div className="vt-muted mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--border)] pt-2 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--text)]">
                  <Store size={12} aria-hidden />
                  <span className="truncate max-w-[200px]">{s.name}</span>
                </span>
                {typeof distanceKm === "number" ? (
                  <span className="inline-flex items-center gap-1">
                    {fmtKm(distanceKm)}
                  </span>
                ) : null}
              </div>
              {s.websiteUrl?.trim() ? (
                <a
                  href={s.websiteUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto mt-1.5 inline-flex max-w-full items-center gap-1 truncate text-xs font-semibold text-[var(--primary)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={12} className="shrink-0" aria-hidden />
                  <span className="truncate">
                    {websiteUrlDisplayLabel(s.websiteUrl.trim())}
                  </span>
                </a>
              ) : null}
              <div className="mt-2 max-w-[300px]">
                <StoreTrustMini score={s.trustScore} />
              </div>
            </div>
          </div>
          <ExternalLink
            size={18}
            className="mt-1 shrink-0 text-[var(--muted)]"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
