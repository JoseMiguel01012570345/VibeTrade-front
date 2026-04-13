import { Link } from "react-router-dom";
import { ExternalLink, Package, Store, Wrench } from "lucide-react";
import type { CatalogOfferPreview, CatalogSearchItem } from "../../utils/market/searchStores";
import { StoreTrustMini } from "../../components/StoreTrustMini";

type Props = Readonly<{
  item: CatalogSearchItem;
}>;

function fmtKm(v: number): string {
  if (v < 1) return `${Math.round(v * 1000)} m`;
  if (v < 10) return `${v.toFixed(1)} km`;
  return `${Math.round(v)} km`;
}

function offerTitle(offer: CatalogOfferPreview): string {
  if (offer.kind === "product")
    return offer.name?.trim() || offer.category || "Producto";
  return offer.tipoServicio?.trim() || offer.category || "Servicio";
}

function offerSubtitle(offer: CatalogOfferPreview): string | null {
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

export function CatalogOfferSearchCard({ item }: Props) {
  const { store: s, offer, distanceKm } = item;
  if (!offer) return null;

  const title = offerTitle(offer);
  const sub = offerSubtitle(offer);
  const desc =
    offer.kind === "product"
      ? offer.shortDescription
      : offer.descripcion;
  const accepted = offer.acceptedCurrencies ?? [];

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
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)]">
              {offer.kind === "product" ? (
                <Package size={22} className="text-[var(--muted)]" aria-hidden />
              ) : (
                <Wrench size={22} className="text-[var(--muted)]" aria-hidden />
              )}
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
