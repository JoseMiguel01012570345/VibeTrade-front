import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "../../app/store/useAppStore";
import type { Offer } from "../../app/store/useMarketStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import { RouteOfferPreview } from "../offer/RouteOfferPreview";
import { VtSelect } from "../../components/VtSelect";
import { fetchCatalogCategories } from "../../utils/market/fetchCatalogCategories";
import {
  searchStores,
  type StoreSearchItem,
} from "../../utils/market/searchStores";
import {
  isTransportFeedOffer,
  userHasTransportService,
} from "../../utils/user/transportEligibility";
import { StoreSearchResultCard } from "./StoreSearchResultCard";

function OffersTab({
  items,
  stores,
  routeOfferPublic,
}: Readonly<{
  items: Offer[];
  stores: Record<string, { id: string; name: string }>;
  routeOfferPublic: Record<string, unknown>;
}>) {
  return (
    <div className="grid grid-cols-12 gap-3.5">
      {items.map((o) => {
        const store = stores[o.storeId];
        const routePreview = routeOfferPublic[o.id] as any;
        return (
          <div
            key={o.id}
            className="vt-card col-span-12 overflow-hidden min-[860px]:col-span-6"
          >
            <Link
              to={`/offer/${o.id}`}
              className="group block h-[190px] overflow-hidden bg-gray-200"
            >
              <img
                src={o.imageUrl}
                alt={o.title}
                className="block h-full w-full scale-[1.02] object-cover transition-transform duration-[240ms] ease-out group-hover:scale-[1.06]"
              />
            </Link>

            <div className="flex flex-col gap-2.5 p-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-black tracking-[-0.02em]">
                  <Link to={`/offer/${o.id}`}>{o.title}</Link>
                </div>
                <div className="shrink-0 font-black text-[var(--text)]">
                  {o.price}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2.5">
                <div className="vt-muted">{o.location}</div>
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

function StoresTab({
  storeNameQ,
  setStoreNameQ,
  storeCategory,
  setStoreCategory,
  km,
  setKm,
  catOptions,
  setGeo,
  storeSearchStatus,
  storeResults,
}: Readonly<{
  storeNameQ: string;
  setStoreNameQ: (v: string) => void;
  storeCategory: string;
  setStoreCategory: (v: string) => void;
  km: string;
  setKm: (v: string) => void;
  catOptions: string[];
  setGeo: (v: { lat: number; lng: number } | null) => void;
  storeSearchStatus: "idle" | "loading" | "ready" | "error";
  storeResults: StoreSearchItem[];
}>) {
  return (
    <div className="vt-card vt-card-pad">
      <div className="mb-3 flex flex-col gap-2 min-[520px]:flex-row min-[520px]:flex-wrap min-[520px]:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] font-semibold text-[var(--muted)]">
          <span>Buscar por nombre</span>
          <input
            type="search"
            className="vt-input"
            placeholder="Nombre de la tienda…"
            value={storeNameQ}
            onChange={(e) => setStoreNameQ(e.target.value)}
            aria-label="Buscar tiendas por nombre"
          />
        </label>
        <label className="flex w-full flex-col gap-1 text-[12px] font-semibold text-[var(--muted)] min-[520px]:w-56">
          <span>Categoría</span>
          <VtSelect
            value={storeCategory}
            onChange={setStoreCategory}
            ariaLabel="Filtrar tiendas por categoría"
            placeholder="Todas"
            options={[
              { value: "", label: "Todas" },
              ...catOptions.map((c) => ({ value: c, label: c })),
            ]}
          />
        </label>
        <label className="flex w-full flex-col gap-1 text-[12px] font-semibold text-[var(--muted)] min-[520px]:w-44">
          <span>Radio (km)</span>
          <input
            inputMode="decimal"
            className="vt-input"
            placeholder="Ej: 10"
            value={km}
            onChange={(e) => {
              const next = e.target.value;
              setKm(next);
              const kmNum = Number(next);
              if (!Number.isFinite(kmNum) || kmNum <= 0) {
                setGeo(null);
                return;
              }
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(
                (p) =>
                  setGeo({
                    lat: p.coords.latitude,
                    lng: p.coords.longitude,
                  }),
                () => setGeo(null),
                { enableHighAccuracy: true, timeout: 8000 },
              );
            }}
            aria-label="Radio de búsqueda en km"
          />
        </label>
      </div>

      {storeSearchStatus === "loading" ? (
        <div className="vt-muted text-[13px]">Buscando…</div>
      ) : null}
      {storeSearchStatus === "error" ? (
        <div className="vt-muted text-[13px]">
          No se pudo buscar tiendas. ¿Backend en marcha?
        </div>
      ) : null}
      {storeSearchStatus === "ready" && storeResults.length === 0 ? (
        <div className="vt-muted text-[13px]">
          Ninguna tienda coincide con el filtro.
        </div>
      ) : null}
      {storeSearchStatus === "ready" && storeResults.length > 0 ? (
        <div className="mt-3 flex flex-col gap-3">
          {storeResults.map((it) => (
            <StoreSearchResultCard
              key={it.store.id}
              store={it.store}
              publishedProducts={it.publishedProducts}
              publishedServices={it.publishedServices}
              distanceKm={it.distanceKm}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HomePage() {
  const me = useAppStore((s) => s.me);
  const offerIds = useMarketStore((s) => s.offerIds);
  const offers = useMarketStore((s) => s.offers);
  const stores = useMarketStore((s) => s.stores);
  const storeCatalogs = useMarketStore((s) => s.storeCatalogs);
  const routeOfferPublic = useMarketStore((s) => s.routeOfferPublic);

  const [tab, setTab] = useState<"offers" | "stores">("offers");

  const hasTransportService = useMemo(
    () => userHasTransportService(me.id, stores, storeCatalogs),
    [me.id, stores, storeCatalogs],
  );

  const items = useMemo(() => {
    const list = offerIds.map((id) => offers[id]).filter(Boolean);
    if (!hasTransportService) return list;
    return list.filter((o) => isTransportFeedOffer(o));
  }, [offerIds, offers, hasTransportService]) as Offer[];

  const [storeNameQ, setStoreNameQ] = useState("");
  const [storeCategory, setStoreCategory] = useState("");
  const [km, setKm] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [catOptions, setCatOptions] = useState<string[]>([]);
  const [storeSearchStatus, setStoreSearchStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [storeResults, setStoreResults] = useState<StoreSearchItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchCatalogCategories();
        if (!cancelled) setCatOptions(list);
      } catch {
        if (!cancelled) setCatOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tab !== "stores") return;
    let cancelled = false;
    setStoreSearchStatus("loading");
    const t = globalThis.setTimeout(() => {
      void (async () => {
        try {
          const kmNum = Number(km);
          const useDistance =
            geo != null && Number.isFinite(kmNum) && kmNum > 0;

          const list = await searchStores({
            name: storeNameQ.trim() || undefined,
            category: storeCategory.trim() || undefined,
            lat: useDistance ? geo.lat : undefined,
            lng: useDistance ? geo.lng : undefined,
            km: useDistance ? kmNum : undefined,
            limit: 60,
          });
          if (cancelled) return;
          setStoreResults(list);
          setStoreSearchStatus("ready");
        } catch {
          if (cancelled) return;
          setStoreSearchStatus("error");
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(t);
    };
  }, [tab, storeNameQ, storeCategory, km, geo]);

  let subtitle = "Buscá tiendas por nombre, categoría, vitrina y distancia.";
  if (tab === "offers") {
    subtitle = hasTransportService
      ? "Feed para transportistas: ofertas de flete, logística y afines (solo lo ves si tenés al menos un servicio de transporte publicado en tu tienda)."
      : "Explorá ofertas publicadas en la plataforma.";
  }

  return (
    <div className="container vt-page">
      <div className="mb-3 mt-2 flex items-center justify-between gap-3">
        <div>
          <h1 className="vt-h1">{tab === "offers" ? "Ofertas" : "Tiendas"}</h1>
          <div className="vt-muted">{subtitle}</div>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className={tab === "offers" ? "vt-btn vt-btn-primary" : "vt-btn"}
            onClick={() => setTab("offers")}
          >
            Ofertas
          </button>
          <button
            type="button"
            className={tab === "stores" ? "vt-btn vt-btn-primary" : "vt-btn"}
            onClick={() => setTab("stores")}
          >
            Tiendas
          </button>
        </div>
      </div>

      {tab === "offers" ? (
        <OffersTab
          items={items}
          stores={stores}
          routeOfferPublic={routeOfferPublic}
        />
      ) : (
        <StoresTab
          storeNameQ={storeNameQ}
          setStoreNameQ={setStoreNameQ}
          storeCategory={storeCategory}
          setStoreCategory={setStoreCategory}
          km={km}
          setKm={setKm}
          catOptions={catOptions}
          setGeo={setGeo}
          storeSearchStatus={storeSearchStatus}
          storeResults={storeResults}
        />
      )}
    </div>
  );
}
