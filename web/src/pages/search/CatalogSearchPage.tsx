import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { VtSelect } from "../../components/VtSelect";
import { fetchCatalogCategories } from "../../utils/market/fetchCatalogCategories";
import {
  searchCatalog,
  type CatalogSearchItem,
} from "../../utils/market/searchStores";
import { StoreSearchResultCard } from "../home/StoreSearchResultCard";
import { CatalogOfferSearchCard } from "./CatalogOfferSearchCard";

type LocationState = { initialQuery?: string } | null;

function requestUserGeo(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

const PAGE_SIZE = 20;

function catalogItemKey(it: CatalogSearchItem, pageIndex: number): string {
  if (it.kind === "store") return `store-${it.store.id}-p${pageIndex}`;
  if (it.offer) return `${it.kind}-${it.offer.id}-p${pageIndex}`;
  return `${it.kind}-${it.store.id}-p${pageIndex}`;
}

export function CatalogSearchPage() {
  const location = useLocation();
  const initialQ =
    (location.state as LocationState)?.initialQuery?.trim() ?? "";

  const [storeNameQ, setStoreNameQ] = useState(initialQ);
  const [storeCategory, setStoreCategory] = useState("");
  const [km, setKm] = useState("");
  const [trustMin, setTrustMin] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [catOptions, setCatOptions] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

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

  const runSearch = useCallback(
    async (nextPageIndex: number) => {
      setStatus("loading");
      try {
        const kmNum = Number(km.trim());
        const wantsDistance = Number.isFinite(kmNum) && kmNum > 0;
        let lat: number | undefined;
        let lng: number | undefined;
        let kmArg: number | undefined;
        if (wantsDistance) {
          let coords = geo;
          if (!coords) {
            coords = await requestUserGeo();
            if (coords) setGeo(coords);
          }
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
            kmArg = kmNum;
          }
        } else {
          setGeo(null);
        }

        const offset = Math.max(0, nextPageIndex) * PAGE_SIZE;
        const { items, totalCount: total } = await searchCatalog({
          name: storeNameQ.trim() || undefined,
          category: storeCategory.trim() || undefined,
          lat,
          lng,
          km: kmArg,
          limit: PAGE_SIZE,
          offset,
        });
        setResults(items);
        setTotalCount(total);
        setPageIndex(nextPageIndex);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    },
    [storeNameQ, storeCategory, km, geo],
  );

  const onSubmitSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      void runSearch(0);
    },
    [runSearch],
  );

  const hasPrevPage = pageIndex > 0;
  const hasNextPage = (pageIndex + 1) * PAGE_SIZE < totalCount;
  const rangeFrom = totalCount === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const rangeTo = Math.min((pageIndex + 1) * PAGE_SIZE, totalCount);

  const TRUST_SCORE_MAX = 100;
  const TRUST_SCORE_FILTER_MIN = -3.402823466e38;
  const trustMinNum = Number(trustMin);
  const filteredResults = results.filter((it) => {
    if (trustMin.trim() === "") return true;
    if (!Number.isFinite(trustMinNum)) return true;
    return it.store.trustScore >= trustMinNum;
  });

  return (
    <div
      className={`container vt-page transition-opacity duration-500 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="mb-3 mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="vt-h1">Buscar</h1>
          <div className="vt-muted">
            Tiendas, productos y servicios. Elegí filtros y pulsá la lupa.
          </div>
        </div>
        <Link className="vt-btn" to="/home">
          Volver
        </Link>
      </div>

      <div className="vt-card vt-card-pad">
        <form
          className="mb-3 flex flex-col gap-2 min-[520px]:flex-row min-[520px]:flex-wrap min-[520px]:items-end"
          onSubmit={onSubmitSearch}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] font-semibold text-[var(--muted)]">
            <span>Buscar</span>
            <input
              type="search"
              className="vt-input"
              placeholder="Nombre, producto, servicio…"
              value={storeNameQ}
              onChange={(e) => setStoreNameQ(e.target.value)}
              aria-label="Buscar en catálogo"
            />
          </label>

          <label className="flex w-full flex-col gap-1 text-[12px] font-semibold text-[var(--muted)] min-[520px]:w-56">
            <span>Categoría</span>
            <VtSelect
              value={storeCategory}
              onChange={setStoreCategory}
              ariaLabel="Filtrar por categoría"
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
                const kmNum = Number(next.trim());
                if (!Number.isFinite(kmNum) || kmNum <= 0) setGeo(null);
              }}
              aria-label="Radio de búsqueda en km"
            />
          </label>

          <label className="flex w-full flex-col gap-1 text-[12px] font-semibold text-[var(--muted)] min-[520px]:w-44">
            <span>Confianza mínima</span>
            <input
              inputMode="decimal"
              className="vt-input"
              placeholder="Ej: 80"
              value={trustMin}
              onChange={(e) => setTrustMin(e.target.value)}
              min={TRUST_SCORE_FILTER_MIN}
              max={TRUST_SCORE_MAX}
              aria-label="Confianza mínima de la tienda"
            />
          </label>

          <div className="flex w-full min-[520px]:w-auto min-[520px]:shrink-0">
            <button
              type="submit"
              className="vt-btn grid h-10 w-full min-w-[2.75rem] place-items-center px-0 min-[520px]:h-10 min-[520px]:w-10"
              disabled={status === "loading"}
              aria-label="Buscar"
            >
              <Search size={20} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        </form>

        {status === "idle" ? (
          <div className="vt-muted text-[13px]">
            Elegí filtros y pulsá la{" "}
            <span className="font-semibold text-[var(--text)]">lupa</span> para ver resultados.
          </div>
        ) : null}
        {status === "loading" ? (
          <div className="vt-muted text-[13px]">Buscando…</div>
        ) : null}
        {status === "error" ? (
          <div className="vt-muted text-[13px]">
            No se pudo buscar. ¿Backend en marcha?
          </div>
        ) : null}
        {status === "ready" && results.length > 0 && filteredResults.length === 0 ? (
          <div className="vt-muted text-[13px]">
            Ningún resultado en esta página cumple la confianza mínima.
          </div>
        ) : null}
        {status === "ready" && results.length === 0 && totalCount === 0 ? (
          <div className="vt-muted text-[13px]">
            Sin resultados para esta búsqueda.
          </div>
        ) : null}
        {status === "ready" && filteredResults.length > 0 ? (
          <>
            <div className="mt-3 flex flex-col gap-3">
              {filteredResults.map((it) => {
                if (it.kind === "store") {
                  return (
                    <StoreSearchResultCard
                      key={catalogItemKey(it, pageIndex)}
                      store={it.store}
                      publishedProducts={it.publishedProducts ?? 0}
                      publishedServices={it.publishedServices ?? 0}
                      distanceKm={it.distanceKm}
                    />
                  );
                }
                return (
                  <CatalogOfferSearchCard
                    key={catalogItemKey(it, pageIndex)}
                    item={it}
                  />
                );
              })}
            </div>
            {totalCount > PAGE_SIZE || pageIndex > 0 ? (
              <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-3 text-[12px] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
                <span className="tabular-nums">
                  {rangeFrom}–{rangeTo} de {totalCount}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="vt-btn vt-btn-sm vt-btn-ghost inline-flex items-center gap-1"
                    disabled={!hasPrevPage}
                    onClick={() => void runSearch(pageIndex - 1)}
                  >
                    <ChevronLeft size={16} aria-hidden />
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="vt-btn vt-btn-sm vt-btn-ghost inline-flex items-center gap-1"
                    disabled={!hasNextPage}
                    onClick={() => void runSearch(pageIndex + 1)}
                  >
                    Siguiente
                    <ChevronRight size={16} aria-hidden />
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
