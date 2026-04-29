import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { cn } from "../../lib/cn";
import { ProtectedMediaImg } from "../../components/media/ProtectedMediaImg";
import type { RouteOfferPublicState } from "../../app/store/marketStoreTypes";
import type { Offer, StoreBadge } from "../../app/store/useMarketStore";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { OfferSaveButton } from "../offer/OfferSaveButton";
import { ExternalLink, Heart, MessageCircle } from "lucide-react";
import { websiteUrlDisplayLabel } from "../../utils/websiteUrl";
import { toggleOfferLike } from "../../utils/market/offerEngagementApi";
import {
  isToolPlaceholderUrl,
  TOOL_PLACEHOLDER_SRC,
} from "../../utils/market/toolPlaceholder";
import { offerDescriptionPreview } from "./homeTextUtils";
import { getSessionToken } from "../../utils/http/sessionToken";
import { buildEmergentMapLegs } from "../../utils/map/emergentRouteMapLegs";
import { EmergentRouteFeedMap } from "./EmergentRouteFeedMap";
import { userHasTransportService } from "../../utils/user/transportEligibility";
import {
  ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES,
  routeOfferPublicBlockedForBuyerWithAgreement,
} from "../chat/domain/routeSheetOfferGuards";

export function OfferCardsChunk({
  items,
  stores,
  routeOfferPublic,
}: Readonly<{
  items: Offer[];
  stores: Record<string, StoreBadge>;
  routeOfferPublic: Partial<Record<string, RouteOfferPublicState>>;
}>) {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const me = useAppStore((s) => s.me);
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  /** El prop `stores` solo incluye tiendas del lote visible; la elegibilidad de transportista debe ver todas las tiendas del usuario. */
  const allStores = useMarketStore((s) => s.stores);
  const threads = useMarketStore((s) => s.threads);
  const sessionReady = isSessionActive || !!getSessionToken();
  return (
    <div className="grid grid-cols-12 gap-3 md:gap-3.5">
      {items.map((o, i) => {
        const store = stores[o.storeId];
        const descFull = o.description?.trim() ?? "";
        const routePreview =
          routeOfferPublic[o.id] ??
          (o.emergentBaseOfferId
            ? routeOfferPublic[o.emergentBaseOfferId]
            : undefined);
        /** Solo publicaciones `emo_*`: el mapa y CTA de suscripción. No mezclar con `routeOfferPublic` hidratado por el chat (suscriptores), para no mutar la tarjeta en el feed. */
        const isEmergentRouteFeed = o.isEmergentRoutePublication === true;
        const descPreview = isEmergentRouteFeed
          ? ""
          : offerDescriptionPreview(descFull);
        const mapLegs = buildEmergentMapLegs(o, routePreview);
        const commentTotal =
          typeof o.publicCommentCount === "number"
            ? o.publicCommentCount
            : (o.qa?.length ?? 0);
        const offerLikes = o.offerLikeCount ?? 0;
        const likedOffer = o.viewerLikedOffer ?? false;
        const thumbSrc =
          o.imageUrl?.trim() ||
          (o.tags.includes("Servicio") ? TOOL_PLACEHOLDER_SRC : undefined);
        const isToolPlaceholder = isToolPlaceholderUrl(thumbSrc);
        const buyerBlockedOnRoute =
          routeOfferPublicBlockedForBuyerWithAgreement(
            routePreview,
            threads,
            me.id,
          );
        const canSubscribeEmergent =
          isEmergentRouteFeed &&
          sessionReady &&
          me.id !== "guest" &&
          userHasTransportService(me.id, allStores, storeCatalogs) &&
          !buyerBlockedOnRoute;
        return (
          <div
            key={`${o.id}-${i}`}
            className="vt-card col-span-12 min-w-0 overflow-hidden md:col-span-6 lg:col-span-4"
          >
            <div className="relative h-[150px] overflow-hidden bg-gray-200 lg:h-[132px]">
              <Link
                to={`/offer/${o.id}`}
                className={cn(
                  "block h-full overflow-hidden",
                  isEmergentRouteFeed ? "group" : !isToolPlaceholder && "group",
                )}
              >
                {isEmergentRouteFeed ? (
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
                      mapKey={`map-${o.id}-${i}`}
                      className="relative z-0 min-h-0 flex-1 overflow-hidden bg-[#e2e8f0] [&_.leaflet-control-attribution]:text-[7px] [&_.leaflet-control-attribution]:opacity-80"
                    />
                  </div>
                ) : (
                  <ProtectedMediaImg
                    src={thumbSrc}
                    alt={o.title}
                    wrapperClassName="block h-full w-full min-h-[150px] lg:min-h-[132px]"
                    className={cn(
                      "block h-full w-full min-h-[150px] transition-transform duration-[240ms] ease-out lg:min-h-[132px]",
                      isToolPlaceholder
                        ? "vt-img-tool-placeholder bg-gray-200 p-3 sm:p-4 lg:p-3"
                        : "scale-[1.02] object-cover group-hover:scale-[1.06]",
                    )}
                  />
                )}
              </Link>
              <div className="pointer-events-auto absolute right-1.5 top-1.5 z-[2] lg:right-1 lg:top-1">
                <OfferSaveButton offerId={o.id} />
              </div>
            </div>

            <div className="flex flex-col gap-2 p-3 lg:gap-2 lg:p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 font-black tracking-[-0.02em] text-[15px] leading-tight lg:text-sm">
                  <Link to={`/offer/${o.id}`} className="line-clamp-2">
                    {o.title}
                  </Link>
                </div>
                <div className="shrink-0 font-black text-[var(--text)] text-sm lg:text-xs">
                  {o.price}
                </div>
              </div>

              {descPreview ? (
                <p
                  className="vt-muted line-clamp-1 min-w-0 break-words text-[11px] leading-snug lg:text-[10px]"
                  title={
                    descFull.length > descPreview.length ? descFull : undefined
                  }
                >
                  {descPreview}
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-2 text-[11px] lg:text-[10px]">
                <span className="inline-flex min-w-0 items-center gap-1 text-[var(--muted)]">
                  <MessageCircle
                    size={14}
                    className="shrink-0 text-[var(--primary)]"
                    aria-hidden
                  />
                  <span className="truncate font-bold text-[var(--text)]">
                    {commentTotal}{" "}
                    <span className="font-semibold text-[var(--muted)]">
                      {commentTotal === 1 ? "comentario" : "comentarios"}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-2 py-0.5 font-extrabold text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--muted)_10%,var(--surface))]"
                  title={likedOffer ? "Quitar me gusta" : "Me gusta"}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!sessionReady) {
                      openAuthModal();
                      return;
                    }
                    void (async () => {
                      try {
                        const r = await toggleOfferLike(o.id);
                        useMarketStore.setState((s) => {
                          const prev = s.offers[o.id];
                          if (!prev) return s;
                          return {
                            ...s,
                            offers: {
                              ...s.offers,
                              [o.id]: {
                                ...prev,
                                offerLikeCount: r.likeCount,
                                viewerLikedOffer: r.liked,
                              },
                            },
                          };
                        });
                      } catch (err) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "No se pudo guardar el me gusta.",
                        );
                      }
                    })();
                  }}
                >
                  <Heart
                    size={14}
                    className={cn(
                      likedOffer &&
                        "fill-[color-mix(in_oklab,var(--bad)_50%,#f43f5e)] text-[color-mix(in_oklab,var(--bad)_50%,#f43f5e)]",
                    )}
                    aria-hidden
                  />
                  <span className="tabular-nums">{offerLikes}</span>
                </button>
              </div>

              <div className="flex flex-col items-end gap-1">
                <Link
                  to={`/store/${store?.id ?? o.storeId}`}
                  className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-2 py-1 text-[11px] font-extrabold text-[var(--text)] lg:px-1.5 lg:text-[10px]"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                  <span className="truncate">{store?.name ?? "Tienda"}</span>
                </Link>
                {store?.websiteUrl ? (
                  <a
                    href={store.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1 truncate text-[10px] font-bold text-[var(--primary)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} className="shrink-0" aria-hidden />
                    <span className="truncate">
                      {websiteUrlDisplayLabel(store.websiteUrl)}
                    </span>
                  </a>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1.5 lg:gap-1">
                {o.tags.map((t) => (
                  <span key={t} className="vt-pill text-[11px] lg:text-[10px]">
                    {t}
                  </span>
                ))}
              </div>
              {isEmergentRouteFeed ? (
                <div className="mt-1.5">
                  {canSubscribeEmergent ? (
                    <Link
                      to={`/offer/${o.id}#hoja-suscribir`}
                      className="vt-btn vt-btn-primary inline-flex w-full items-center justify-center text-[12px] font-extrabold lg:text-[11px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Suscribirse
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="vt-btn vt-btn-primary inline-flex w-full items-center justify-center text-[12px] font-extrabold disabled:cursor-not-allowed disabled:opacity-50 lg:text-[11px]"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!sessionReady) {
                          openAuthModal();
                          return;
                        }
                        if (!userHasTransportService(me.id, allStores, storeCatalogs)) {
                          toast.error(
                            "Necesitas un servicio de transporte publicado en tu tienda para suscribirte.",
                          );
                          return;
                        }
                        if (
                          routeOfferPublicBlockedForBuyerWithAgreement(
                            routePreview,
                            threads,
                            me.id,
                          )
                        ) {
                          toast.error(ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES);
                          return;
                        }
                      }}
                      disabled={!sessionReady}
                    >
                      Suscribirse
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
