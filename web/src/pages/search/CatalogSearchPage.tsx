import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { VtMultiSelect } from "../../components/VtMultiSelect";
import type { VtSelectOption } from "../../components/VtSelect";
import { fetchCatalogCategories } from "../../utils/market/fetchCatalogCategories";
import {
  searchCatalog,
  type CatalogSearchKind,
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

type SavedSearchStateV3 = {
  v: 3;
  savedAt: number;
  storeNameQ: string;
  storeCategories: string[];
  kinds: CatalogSearchKind[];
  km: string;
  trustMin: string;
  appliedTrustMin: string;
  geo: { lat: number; lng: number } | null;
  status: "idle" | "loading" | "ready" | "error";
  results: CatalogSearchItem[];
  pageIndex: number;
  totalCount: number;
  scrollY: number;
};

const SEARCH_STATE_KEY = "vt:catalogSearch:v3";

export function CatalogSearchPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ =
    (location.state as LocationState)?.initialQuery?.trim() ?? "";

  const [storeNameQ, setStoreNameQ] = useState(initialQ);
  const [storeCategories, setStoreCategories] = useState<string[]>([]);
  const [kinds, setKinds] = useState<CatalogSearchKind[]>([
    "store",
    "product",
    "service",
  ]);
  const [km, setKm] = useState("");
  const [trustMin, setTrustMin] = useState("");
  const [appliedTrustMin, setAppliedTrustMin] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [catOptions, setCatOptions] = useState<string[]>([]);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [results, setResults] = useState<CatalogSearchItem[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [didRestore, setDidRestore] = useState(false);
  const [pendingRestoreScrollY, setPendingRestoreScrollY] = useState<
    number | null
  >(null);
  const [didApplyPageFromRoute, setDidApplyPageFromRoute] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    if (didRestore) return;
    const saved = loadSavedSearchState();
    if (!saved) {
      setDidRestore(true);
      return;
    }

    // Si llegamos con un initialQuery explícito (p.ej. desde Home), preferimos ese flujo.
    if (initialQ.trim()) {
      setDidRestore(true);
      return;
    }

    setStoreNameQ(saved.storeNameQ);
    setStoreCategories(saved.storeCategories);
    setKinds(saved.kinds);
    setKm(saved.km);
    setTrustMin(saved.trustMin);
    setAppliedTrustMin(saved.appliedTrustMin);
    setGeo(saved.geo);
    setStatus(saved.status);
    setResults(saved.results);
    setPageIndex(saved.pageIndex);
    setTotalCount(saved.totalCount);
    setPendingRestoreScrollY(saved.scrollY);
    setDidRestore(true);
  }, [didRestore, initialQ]);

  useEffect(() => {
    if (!didRestore) return;
    if (didApplyPageFromRoute) return;
    const raw = (searchParams.get("page") ?? "").trim();
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) {
      setPageIndex(Math.max(0, Math.floor(n - 1)));
    }
    setDidApplyPageFromRoute(true);
  }, [didRestore, didApplyPageFromRoute, searchParams]);

  useEffect(() => {
    if (pendingRestoreScrollY === null) return;
    if (status !== "ready") return;
    const y = pendingRestoreScrollY;
    const t = requestAnimationFrame(() => {
      window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      setPendingRestoreScrollY(null);
    });
    return () => cancelAnimationFrame(t);
  }, [pendingRestoreScrollY, status]);

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
    if (!didRestore) return;
    const save = () => {
      saveSearchState({
        v: 3,
        savedAt: Date.now(),
        storeNameQ,
        storeCategories,
        kinds,
        km,
        trustMin,
        appliedTrustMin,
        geo,
        status,
        results,
        pageIndex,
        totalCount,
        scrollY: window.scrollY,
      });
    };

    const onScroll = () => save();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Guardado inicial cuando cambia algo importante (resultados/página/filtros).
    save();

    return () => {
      window.removeEventListener("scroll", onScroll);
      save();
    };
  }, [
    didRestore,
    storeNameQ,
    storeCategories,
    kinds,
    km,
    trustMin,
    appliedTrustMin,
    geo,
    status,
    results,
    pageIndex,
    totalCount,
  ]);

  const categoryOptions: VtSelectOption[] = useMemo(
    () => catOptions.map((c) => ({ value: c, label: c })),
    [catOptions],
  );

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
          category:
            storeCategories.length > 0 ? storeCategories.join(",") : undefined,
          kinds,
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

        setSearchParams((prev) => {
          const p = new URLSearchParams(prev);
          const page1 = Math.max(1, nextPageIndex + 1);
          if (page1 === 1) p.delete("page");
          else p.set("page", String(page1));
          return p;
        });
      } catch {
        setStatus("error");
      }
    },
    [storeNameQ, storeCategories, kinds, km, geo, setSearchParams],
  );

  const onSubmitSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setAppliedTrustMin(trustMin);
      window.scrollTo({ top: 0, behavior: "smooth" });
      void runSearch(0);
    },
    [runSearch, trustMin],
  );

  const hasPrevPage = pageIndex > 0;
  const hasNextPage = (pageIndex + 1) * PAGE_SIZE < totalCount;
  const rangeFrom = totalCount === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const rangeTo = Math.min((pageIndex + 1) * PAGE_SIZE, totalCount);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(totalPages, pageIndex + 1);

  const TRUST_SCORE_MAX = 100;
  const TRUST_SCORE_FILTER_MIN = -3.402823466e38;
  const trustMinNum = Number(appliedTrustMin);
  const filteredResults = results.filter((it) => {
    if (appliedTrustMin.trim() === "") return true;
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

          <label className="flex w-full flex-col gap-1 text-[12px] font-semibold text-[var(--muted)] min-[520px]:w-72">
            <span>Categorías</span>
            <VtMultiSelect
              value={storeCategories}
              onChange={setStoreCategories}
              ariaLabel="Filtrar por categorías"
              placeholder="Todas"
              options={categoryOptions}
            />
          </label>

          <label className="flex w-full flex-col gap-1 text-[12px] font-semibold text-[var(--muted)] min-[520px]:w-56">
            <span>Tipo</span>
            <VtMultiSelect
              value={kinds}
              onChange={(next) => {
                const safe =
                  next.length === 0
                    ? (["store", "product", "service"] as CatalogSearchKind[])
                    : (next as CatalogSearchKind[]);
                setKinds(safe);
              }}
              ariaLabel="Filtrar por tipo"
              placeholder="Todos"
              options={[
                { value: "store", label: "Tiendas" },
                { value: "product", label: "Productos" },
                { value: "service", label: "Servicios" },
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
            <div className="mt-3 grid grid-cols-1 gap-3 min-[720px]:grid-cols-2 min-[1040px]:grid-cols-3">
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
              <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-3 text-[12px] text-[var(--muted)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="tabular-nums">
                    {rangeFrom}–{rangeTo} de {totalCount}
                  </span>
                  <span className="tabular-nums">
                    Página <b className="text-[var(--text)]">{currentPage}</b> de{" "}
                    <b className="text-[var(--text)]">{totalPages}</b>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="vt-btn vt-btn-sm vt-btn-ghost inline-flex items-center gap-1"
                    disabled={!hasPrevPage}
                    onClick={() => void runSearch(pageIndex - 1)}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} aria-hidden />
                    Anterior
                  </button>

                  {buildPaginationModel(currentPage, totalPages).map((x, i) => {
                    if (x === "…") {
                      return (
                        <span
                          key={`dots-${currentPage}-${totalPages}-${i}`}
                          className="px-2 text-[12px] text-[var(--muted)]"
                        >
                          …
                        </span>
                      );
                    }
                    const isActive = x === currentPage;
                    return (
                      <button
                        key={`p-${x}`}
                        type="button"
                        className={`vt-btn vt-btn-sm ${
                          isActive ? "" : "vt-btn-ghost"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => void runSearch(x - 1)}
                      >
                        {x}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    className="vt-btn vt-btn-sm vt-btn-ghost inline-flex items-center gap-1"
                    disabled={!hasNextPage}
                    onClick={() => void runSearch(pageIndex + 1)}
                    aria-label="Página siguiente"
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

function buildPaginationModel(
  currentPage: number,
  totalPages: number,
): Array<number | "…"> {
  if (totalPages <= 1) return [1];
  const clamp = (n: number) => Math.max(1, Math.min(totalPages, n));
  const windowStart = clamp(currentPage - 2);
  const windowEnd = clamp(currentPage + 2);
  const out: Array<number | "…"> = [];

  out.push(1);
  if (windowStart > 2) out.push("…");
  for (let p = Math.max(2, windowStart); p <= Math.min(totalPages - 1, windowEnd); p++) {
    out.push(p);
  }
  if (windowEnd < totalPages - 1) out.push("…");
  out.push(totalPages);

  // Dedup por si la ventana toca extremos.
  const dedup: Array<number | "…"> = [];
  let prev: number | "…" | undefined;
  for (const x of out) {
    if (x === prev) continue;
    dedup.push(x);
    prev = x;
  }
  return dedup;
}

function loadSavedSearchState(): SavedSearchStateV3 | null {
  try {
    const raw = sessionStorage.getItem(SEARCH_STATE_KEY);
    if (!raw) return null;
    const parsedUnknown: unknown = JSON.parse(raw);
    const parsed =
      parsedUnknown !== null &&
      typeof parsedUnknown === "object" &&
      !Array.isArray(parsedUnknown)
        ? (parsedUnknown as Record<string, unknown>)
        : null;
    if (!parsed) return null;

    const v = parsed.v;
    const results = parsed.results;
    const kinds = parsed.kinds;
    const scrollY = parsed.scrollY;
    if (!Array.isArray(results)) return null;
    if (!Array.isArray(kinds)) return null;
    if (typeof scrollY !== "number") return null;

    // v3
    if (v === 3) {
      const storeCategoriesRaw = parsed.storeCategories;
      if (!Array.isArray(storeCategoriesRaw)) return null;
      const storeCategories = storeCategoriesRaw.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      );
      return {
        ...(parsed as unknown as SavedSearchStateV3),
        storeCategories,
        results: normalizeCatalogSearchItems(results as CatalogSearchItem[]),
      };
    }

    // v2 (compat): storeCategory string -> storeCategories[]
    if (v !== 2) return null;
    const sc =
      typeof parsed.storeCategory === "string"
        ? parsed.storeCategory.trim()
        : "";
    return {
      ...(parsed as unknown as SavedSearchStateV3),
      v: 3,
      storeCategories: sc ? [sc] : [],
      results: normalizeCatalogSearchItems(results as CatalogSearchItem[]),
    };
  } catch {
    return null;
  }
}

function saveSearchState(s: SavedSearchStateV3): void {
  try {
    sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function normalizeCatalogSearchItems(items: CatalogSearchItem[]): CatalogSearchItem[] {
  return items.map((it) => {
    const offer = it.offer;
    if (!offer) return it;
    const accepted = (offer as { acceptedCurrencies?: unknown })?.acceptedCurrencies;
    const safeAccepted =
      Array.isArray(accepted) ? accepted.filter((x) => typeof x === "string") : [];
    return {
      ...it,
      offer: {
        ...offer,
        acceptedCurrencies: safeAccepted,
      },
    };
  });
}
