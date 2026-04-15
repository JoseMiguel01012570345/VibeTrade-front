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
  fetchCatalogAutocomplete,
  type CatalogSearchKind,
  type CatalogSearchItem,
} from "../../utils/market/searchStores";
import { VtAutocompleteInput } from "../../components/VtAutocompleteInput";
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
  v: 4;
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
  hasMore?: boolean;
  pageIndex: number;
  scrollY: number;
};

const SEARCH_STATE_KEY = "vt:catalogSearch:v4";

export function CatalogSearchPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ =
    (location.state as LocationState)?.initialQuery?.trim() ?? "";

  const [storeNameQ, setStoreNameQ] = useState(initialQ);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
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
  const [hasMore, setHasMore] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [didRestore, setDidRestore] = useState(false);
  const [pendingRestoreScrollY, setPendingRestoreScrollY] = useState<
    number | null
  >(null);
  const [didApplyPageFromRoute, setDidApplyPageFromRoute] = useState(false);

  useEffect(() => {
    const q = storeNameQ.trim();
    if (q.length < 2) {
      setNameSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const next = await fetchCatalogAutocomplete(
            q,
            { kinds, categories: storeCategories },
            10,
          );
          if (!cancelled) setNameSuggestions(next);
        } catch {
          if (!cancelled) setNameSuggestions([]);
        }
      })();
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [storeNameQ, kinds, storeCategories]);

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
    setHasMore(saved.hasMore ?? false);
    setPageIndex(saved.pageIndex);
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
        v: 4,
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
        hasMore,
        pageIndex,
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
    hasMore,
    pageIndex,
  ]);

  const categoryOptions: VtSelectOption[] = useMemo(
    () => catOptions.map((c) => ({ value: c, label: c })),
    [catOptions],
  );

  const runSearch = useCallback(
    async (nextPageIndex: number, trustMinOverride?: string) => {
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
        const trustText = (trustMinOverride ?? appliedTrustMin).trim();
        const trustNum = Number(trustText);
        const { items, hasMore: more } = await searchCatalog({
          name: storeNameQ.trim() || undefined,
          category:
            storeCategories.length > 0 ? storeCategories.join(",") : undefined,
          kinds,
          trustMin:
            trustText !== "" && Number.isFinite(trustNum)
              ? trustNum
              : undefined,
          lat,
          lng,
          km: kmArg,
          limit: PAGE_SIZE,
          offset,
        });
        setResults(items);
        setHasMore(more);
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
    [
      storeNameQ,
      storeCategories,
      kinds,
      km,
      geo,
      appliedTrustMin,
      setSearchParams,
    ],
  );

  const onSubmitSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const nextTrust = trustMin.trim();
      setAppliedTrustMin(nextTrust);
      window.scrollTo({ top: 0, behavior: "smooth" });
      void runSearch(0, nextTrust);
    },
    [runSearch, trustMin],
  );

  const hasPrevPage = pageIndex > 0;
  const hasNextPage = hasMore;

  const TRUST_SCORE_MAX = 100;
  const TRUST_SCORE_FILTER_MIN = -3.402823466e38;
  // trustMin ahora se aplica en backend/ES para que el page size sea real.

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
            <VtAutocompleteInput
              value={storeNameQ}
              onChange={setStoreNameQ}
              options={nameSuggestions.map((s) => ({ value: s }))}
              placeholder="Nombre, producto, servicio…"
              ariaLabel="Buscar en catálogo"
              matchMode="fuzzy"
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
            <span className="font-semibold text-[var(--text)]">lupa</span> para
            ver resultados.
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
        {status === "ready" && results.length === 0 ? (
          <div className="vt-muted text-[13px]">
            Sin resultados para esta búsqueda.
          </div>
        ) : null}
        {status === "ready" && results.length > 0 ? (
          <>
            <div className="mt-3 grid grid-cols-1 gap-3 min-[720px]:grid-cols-2 min-[1040px]:grid-cols-3">
              {results.map((it) => {
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
          </>
        ) : null}
      </div>
    </div>
  );
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

    // v4
    if (v === 4) {
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

    // v3 (compat): sin hasMore explícito
    if (v === 3) {
      const storeCategoriesRaw = parsed.storeCategories;
      if (!Array.isArray(storeCategoriesRaw)) return null;
      const storeCategories = storeCategoriesRaw.filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0,
      );
      return {
        ...(parsed as unknown as SavedSearchStateV3),
        v: 4,
        hasMore: false,
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
      v: 4,
      hasMore: false,
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

function normalizeCatalogSearchItems(
  items: CatalogSearchItem[],
): CatalogSearchItem[] {
  return items.map((it) => {
    const offer = it.offer;
    if (!offer) return it;
    const accepted = (offer as { acceptedCurrencies?: unknown })
      ?.acceptedCurrencies;
    const safeAccepted = Array.isArray(accepted)
      ? accepted.filter((x) => typeof x === "string")
      : [];
    return {
      ...it,
      offer: {
        ...offer,
        acceptedCurrencies: safeAccepted,
      },
    };
  });
}
