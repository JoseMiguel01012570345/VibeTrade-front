import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { mergeStoreCatalogWithLocalExtras } from "../chat/domain/storeCatalogTypes";
import { fetchStoreDetail } from "../../utils/market/fetchStoreDetail";
import { setMarketHydrating } from "../../utils/market/marketPersistence";
import { PointLocationFeedMap } from "../home/EmergentRouteFeedMap";
import { isValidStoreLocation } from "../home/homeTextUtils";

/**
 * Vista solo mapa (Leaflet OSM, zoom y arrastre) para la ubicación de una tienda — misma base que rutas y feed.
 */
export function StoreLocationMapPage() {
  const { storeId } = useParams();
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);
  const store = useMarketStore((s) =>
    storeId ? s.stores[storeId] : undefined,
  );
  const [loadDone, setLoadDone] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setLoadDone(true);
      return;
    }

    const cached = useMarketStore.getState().stores[storeId];
    if (isValidStoreLocation(cached?.location)) {
      setLoadDone(true);
      return;
    }

    let cancelled = false;
    setLoadDone(false);
    void (async () => {
      try {
        const data = await fetchStoreDetail(storeId, { userId: me.id });
        if (cancelled) return;
        setMarketHydrating(true);
        try {
          useMarketStore.setState((s) => ({
            stores: { ...s.stores, [storeId]: data.store },
            storeCatalogs: {
              ...s.storeCatalogs,
              [storeId]: mergeStoreCatalogWithLocalExtras(
                s.storeCatalogs[storeId],
                data.catalog,
              ),
            },
          }));
        } finally {
          setMarketHydrating(false);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error && err.message
              ? err.message
              : "No se pudo cargar la tienda.";
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setLoadDone(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storeId, me.id]);

  if (!storeId || !loadDone) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad text-[15px] text-[var(--muted)]">
          Cargando mapa…
        </div>
      </div>
    );
  }

  const loc = store?.location;
  if (!isValidStoreLocation(loc)) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad space-y-3">
          <p>Esta tienda no tiene ubicación en mapa.</p>
          <Link
            to={`/store/${encodeURIComponent(storeId)}`}
            className="vt-btn vt-btn-sm inline-block no-underline"
          >
            Volver a la tienda
          </Link>
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
        <span className="text-sm font-black text-slate-800">
          {store?.name?.trim() ?
            `Ubicación · ${store.name.trim()}`
          : "Ubicación de la tienda"}
        </span>
      </div>
      <div className="relative z-0 min-h-0 flex-1 bg-[#e2e8f0]">
        <PointLocationFeedMap
          location={loc}
          mapKey={`store-map-full-${storeId}`}
          interactive
          fixedZoom={16}
          className="h-[calc(100dvh-52px)] min-h-[320px] w-full [&_.leaflet-container]:z-0 [&_.leaflet-control-attribution]:text-[9px]"
        />
      </div>
    </div>
  );
}
