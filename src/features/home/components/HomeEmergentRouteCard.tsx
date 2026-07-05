import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@shared/lib/cn";
import type { RouteOfferPublicState } from "@features/market/logic/store/marketStoreTypes";
import type { Offer } from "@features/market/logic/store/useMarketStore";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { OfferSaveButton } from "@features/market/components/OfferSaveButton";
import { getSessionToken } from "@shared/services/http/sessionToken";
import { buildEmergentMapLegs } from "@features/market/logic/map/emergentRouteMapLegs";
import { EmergentRouteFeedMap } from "./EmergentRouteFeedMap";
import { userHasTransportService } from "@features/market/logic/transportEligibility";
import {
  ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES,
  routeOfferPublicBlockedForBuyerWithAgreement,
} from "@features/chat/logic/route-sheet/routeSheetOfferGuards";

const HOME_ROUTE_CARD =
  "group flex h-full min-w-0 flex-col rounded-[18px] border border-[#d9d5cf] bg-white p-3 shadow-[0_12px_30px_rgba(33,37,41,0.05)] transition hover:-translate-y-1 hover:shadow-[0_20px_36px_rgba(33,37,41,0.08)]";

export function HomeEmergentRouteCard({
  offer,
  routePreview,
  mapKey,
}: Readonly<{
  offer: Offer;
  routePreview: RouteOfferPublicState | undefined;
  mapKey: string;
}>) {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const me = useAppStore((s) => s.me);
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  const allStores = useMarketStore((s) => s.stores);
  const threads = useMarketStore((s) => s.threads);
  const sessionReady = isSessionActive || !!getSessionToken();
  const mapLegs = buildEmergentMapLegs(offer, routePreview);
  const buyerBlockedOnRoute = routeOfferPublicBlockedForBuyerWithAgreement(
    routePreview,
    threads,
    me.id,
  );
  const canSubscribeEmergent =
    sessionReady &&
    me.id !== "guest" &&
    userHasTransportService(me.id, allStores, storeCatalogs) &&
    !buyerBlockedOnRoute;

  return (
    <article className={HOME_ROUTE_CARD}>
      <div className="relative overflow-hidden rounded-[14px]">
        <Link to={`/offer/${offer.id}`} className="block">
          <div className="flex min-h-[140px] w-full flex-col overflow-hidden sm:min-h-[160px]">
            <div className="shrink-0 border-b border-slate-200/80 bg-[#eef2f7] py-1.5 text-center text-[11px] font-black tracking-wide text-slate-800">
              Hoja de ruta
            </div>
            <EmergentRouteFeedMap
              legs={mapLegs}
              mapKey={mapKey}
              className="relative z-0 min-h-[120px] flex-1 overflow-hidden bg-[#e2e8f0] [&_.leaflet-control-attribution]:text-[7px] [&_.leaflet-control-attribution]:opacity-80"
            />
          </div>
        </Link>
        <OfferSaveButton offerId={offer.id} overlay />
      </div>

      <div className="flex min-w-0 flex-1 flex-col px-1 pt-4">
        <p className="h-4 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Transporte
        </p>

        <Link to={`/offer/${offer.id}`} className="mt-2 block shrink-0">
          <h3
            className="line-clamp-2 h-12 overflow-hidden text-lg font-extrabold leading-6 text-slate-900"
            title={offer.title}
          >
            {offer.title}
          </h3>
        </Link>

        <div className="mt-auto shrink-0 pt-5">
          {canSubscribeEmergent ? (
            <Link
              to={`/offer/${offer.id}#hoja-suscribir`}
              className={cn(
                "flex h-11 w-full items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white transition hover:bg-emerald-800",
              )}
            >
              Suscribirse
            </Link>
          ) : (
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              onClick={() => {
                if (!sessionReady) {
                  openAuthModal();
                  return;
                }
                if (
                  !userHasTransportService(me.id, allStores, storeCatalogs)
                ) {
                  toast.error(
                    "Necesitas un servicio de transporte publicado en tu tienda para suscribirte.",
                  );
                  return;
                }
                if (buyerBlockedOnRoute) {
                  toast.error(ROUTE_SUBSCRIBE_BLOCKED_BUYER_WITH_AGREEMENT_ES);
                }
              }}
              disabled={!sessionReady}
            >
              Suscribirse
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
