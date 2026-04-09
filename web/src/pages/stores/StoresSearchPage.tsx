import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { VtSelect } from "../../components/VtSelect";
import { fetchCatalogCategories } from "../../utils/market/fetchCatalogCategories";
import { searchStores, type StoreSearchItem } from "../../utils/market/searchStores";
import { StoreSearchResultCard } from "../home/StoreSearchResultCard";

export function StoresSearchPage() {
  const [storeNameQ, setStoreNameQ] = useState("");
  const [storeCategory, setStoreCategory] = useState("");
  const [km, setKm] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [catOptions, setCatOptions] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [results, setResults] = useState<StoreSearchItem[]>([]);

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
    let cancelled = false;
    setStatus("loading");
    const t = globalThis.setTimeout(() => {
      void (async () => {
        try {
          const kmNum = Number(km);
          const useDistance = geo != null && Number.isFinite(kmNum) && kmNum > 0;
          const list = await searchStores({
            name: storeNameQ.trim() || undefined,
            category: storeCategory.trim() || undefined,
            lat: useDistance ? geo.lat : undefined,
            lng: useDistance ? geo.lng : undefined,
            km: useDistance ? kmNum : undefined,
            limit: 60,
          });
          if (cancelled) return;
          setResults(list);
          setStatus("ready");
        } catch {
          if (cancelled) return;
          setStatus("error");
        }
      })();
    }, 250);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(t);
    };
  }, [storeNameQ, storeCategory, km, geo]);

  return (
    <div className="container vt-page">
      <div className="mb-3 mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="vt-h1">Tiendas</h1>
          <div className="vt-muted">
            Buscá tiendas por nombre, categoría y distancia (km).
          </div>
        </div>
        <Link className="vt-btn" to="/home">
          Volver
        </Link>
      </div>

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

        {status === "loading" ? (
          <div className="vt-muted text-[13px]">Buscando…</div>
        ) : null}
        {status === "error" ? (
          <div className="vt-muted text-[13px]">
            No se pudo buscar tiendas. ¿Backend en marcha?
          </div>
        ) : null}
        {status === "ready" && results.length === 0 ? (
          <div className="vt-muted text-[13px]">
            Ninguna tienda coincide con el filtro.
          </div>
        ) : null}
        {status === "ready" && results.length > 0 ? (
          <div className="mt-3 flex flex-col gap-3">
            {results.map((it) => (
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
    </div>
  );
}

