import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useMarketStore } from "../../app/store/useMarketStore";
import { buildEmergentMapLegs } from "../../utils/map/emergentRouteMapLegs";
import { EmergentRouteFeedMap } from "../home/EmergentRouteFeedMap";
import { offerFromStoreCatalogs } from "../../utils/market/offerFromCatalog";
import { fetchPublicOfferCard } from "../../utils/market/marketPersistence";

/**
 * Vista solo mapa (tramos arrastrables / zoom) para publicaciones emergentes de hoja de ruta.
 */
export function OfferRouteMapPage() {
  const { offerId } = useParams();
  const nav = useNavigate();
  const offer = useMarketStore((s) =>
    offerId ? s.offers[offerId] : undefined,
  );
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);

  const [publicCardLoadDone, setPublicCardLoadDone] = useState(() => {
    if (!offerId) return true;
    const st = useMarketStore.getState();
    if (st.offers[offerId]) return true;
    if (offerFromStoreCatalogs(offerId, st.storeCatalogs)) return true;
    return false;
  });

  const offerFromCatalog = useMemo(
    () =>
      offerId ? offerFromStoreCatalogs(offerId, storeCatalogs) : undefined,
    [offerId, storeCatalogs],
  );
  const resolvedOffer = offer ?? offerFromCatalog;

  const threadCatalogId = useMemo(
    () =>
      offer?.emergentBaseOfferId?.trim() ||
      offerFromCatalog?.emergentBaseOfferId?.trim() ||
      offerId,
    [offer, offerFromCatalog, offerId],
  );
  const routeOffer = useMarketStore((s) =>
    threadCatalogId ? s.routeOfferPublic[threadCatalogId] : undefined,
  );

  useLayoutEffect(() => {
    if (!offerId || offer || !offerFromCatalog) return;
    useMarketStore.setState((s) => {
      if (s.offers[offerId]) return s;
      return {
        ...s,
        offers: { ...s.offers, [offerId]: offerFromCatalog },
      };
    });
  }, [offerId, offer, offerFromCatalog]);

  useEffect(() => {
    if (!offerId) {
      setPublicCardLoadDone(false);
      return;
    }
    if (offer || offerFromCatalog) {
      setPublicCardLoadDone(true);
      return;
    }
    setPublicCardLoadDone(false);
    void fetchPublicOfferCard(offerId)
      .then((r) => {
        if (r) {
          const storeKey = r.store.id?.trim() || r.offer.storeId;
          useMarketStore.setState((s) => {
            const nextStores = { ...s.stores };
            if (storeKey) {
              nextStores[storeKey] = {
                ...s.stores[storeKey],
                ...r.store,
                id: storeKey,
              };
            }
            return {
              ...s,
              offers: { ...s.offers, [r.offer.id]: r.offer },
              stores: nextStores,
            };
          });
        }
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "No se pudo cargar la ficha.";
        toast.error(msg);
      })
      .finally(() => {
        setPublicCardLoadDone(true);
      });
  }, [offerId, offer, offerFromCatalog]);

  const emergentMapLegs = useMemo(
    () =>
      resolvedOffer ? buildEmergentMapLegs(resolvedOffer, routeOffer) : [],
    [resolvedOffer, routeOffer],
  );

  const isEmergent = !!resolvedOffer?.isEmergentRoutePublication;

  if (!offerId || !publicCardLoadDone) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad text-[15px] text-[var(--muted)]">
          Cargando mapa…
        </div>
      </div>
    );
  }

  if (!resolvedOffer || !isEmergent) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad space-y-3">
          <p>Mapa no disponible para esta ficha.</p>
          {offerId ? (
            <button
              type="button"
              className="vt-btn vt-btn-sm"
              onClick={() => nav(`/offer/${encodeURIComponent(offerId)}`)}
            >
              Volver a la oferta
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-0px)] flex-col">
      <div className="relative z-20 flex shrink-0 items-center gap-2 border-b border-slate-200/90 bg-[#eef2f7] px-3 py-2.5">
        <button
          type="button"
          className="vt-btn vt-btn-sm inline-flex items-center gap-1"
          onClick={() => nav(-1)}
        >
          <ArrowLeft size={16} aria-hidden />
          Volver
        </button>
        <span className="text-sm font-black text-slate-800">Mapa de la ruta</span>
      </div>
      <div className="relative z-0 min-h-0 flex-1 bg-[#e2e8f0]">
        {emergentMapLegs.length > 0 ? (
          <EmergentRouteFeedMap
            legs={emergentMapLegs}
            mapKey={`offer-map-full-${resolvedOffer.id}`}
            interactive
            className="h-[calc(100dvh-52px)] min-h-[320px] w-full [&_.leaflet-container]:z-0 [&_.leaflet-control-attribution]:text-[9px]"
          />
        ) : (
          <div className="flex h-[calc(100dvh-52px)] min-h-[200px] items-center justify-center text-sm font-bold text-slate-600">
            No hay tramos con coordenadas para mostrar.
          </div>
        )}
      </div>
    </div>
  );
}
