import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStorePageDetail } from "@features/market/hooks/useStorePageDetail";
import { useStoreIdFromName } from "@features/market/hooks/useStoreByName";
import {
  isReservedStoreName,
  storeMapHref,
} from "@features/market/logic/store/storePath";
import { ServiceDetailCard } from "@features/market/components/ServiceDetailCard";
import { StorefrontProductCard } from "../components/StorefrontProductCard";
import { ScrollArrowButton } from "../components/ScrollArrowButton";
import { StorefrontChrome } from "../components/StorefrontChrome";

const ALL_CATEGORIES = "__all__";
const LATEST_PRODUCTS_COUNT = 4;

/** Familia de productos para el carrusel de categorías (por tienda). */
type CategoryMeta = { id: string; label: string; slug: string };

/**
 * Storefront (vista de cliente) de una tienda. Se muestra a cualquier visitante
 * que entra a `/store/:storeId` desde el feed, la búsqueda o el perfil de otro.
 * Réplica de la UI/UX del catálogo de la app de referencia (frontend-guest,
 * `src/pages/Catalog.tsx`): carrusel "Explora por Categoría" con flechas de
 * desplazamiento, "Productos más recientes" y grid "Ofertas que no puedes dejar
 * pasar". Adaptada a un catálogo por tienda: las categorías filtran el grid.
 */
export function StorefrontPage() {
  const { storeName } = useParams();
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);
  const { storeId, resolving, notFound } = useStoreIdFromName(storeName, me.id);
  const store = useMarketStore((s) => (storeId ? s.stores[storeId] : undefined));
  const catalog = useMarketStore((s) =>
    storeId ? s.storeCatalogs[storeId] : undefined,
  );
  const [loadNonce] = useState(0);
  const { detailStatus } = useStorePageDetail(storeId, me.id, loadNonce);
  const [searchParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);

  const categoriesScrollerRef = useRef<HTMLDivElement | null>(null);
  const [categoryScroll, setCategoryScroll] = useState({
    canLeft: false,
    canRight: false,
  });

  /**
   * El término puede llegar por URL (`?q=`) al buscar desde otra vista (p. ej. el
   * detalle) y la categoría por `?cat=` (desde el menú de Categorías / "Ver todos").
   */
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
    setActiveCategory(searchParams.get("cat")?.trim() || ALL_CATEGORIES);
  }, [storeId, searchParams]);

  const publishedProducts = useMemo(
    () => (catalog?.products ?? []).filter((p) => p.published),
    [catalog],
  );
  const publishedServices = useMemo(
    () => (catalog?.services ?? []).filter((s) => s.published !== false),
    [catalog],
  );

  const categoryMetas: CategoryMeta[] = useMemo(() => {
    const fromProducts = publishedProducts
      .map((p) => p.category.trim())
      .filter(Boolean);
    const fromStore = (store?.categories ?? [])
      .map((c) => c.trim())
      .filter(Boolean);
    const unique = Array.from(new Set([...fromStore, ...fromProducts]));
    return unique.map((label) => ({ id: label, label, slug: label }));
  }, [publishedProducts, store]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publishedProducts.filter((p) => {
      if (
        activeCategory !== ALL_CATEGORIES &&
        p.category.trim() !== activeCategory
      )
        return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [publishedProducts, activeCategory, query]);

  const isBrowsingAll = activeCategory === ALL_CATEGORIES && !query.trim();
  const latestProducts = useMemo(
    () => publishedProducts.slice(0, LATEST_PRODUCTS_COUNT),
    [publishedProducts],
  );

  let mainHeading = "Ofertas que no puedes dejar pasar";
  if (!isBrowsingAll) {
    mainHeading =
      activeCategory === ALL_CATEGORIES ? "Resultados" : activeCategory;
  }

  const updateCategoryScrollState = useCallback(() => {
    const el = categoriesScrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const canLeft = el.scrollLeft > 1;
    const canRight = el.scrollLeft < maxScroll - 1;
    setCategoryScroll((prev) =>
      prev.canLeft === canLeft && prev.canRight === canRight
        ? prev
        : { canLeft, canRight },
    );
  }, []);

  const scrollCategories = useCallback((direction: "left" | "right") => {
    const el = categoriesScrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 200);
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const el = categoriesScrollerRef.current;
    if (!el) return;
    updateCategoryScrollState();
    el.addEventListener("scroll", updateCategoryScrollState, { passive: true });
    const win = typeof globalThis === "undefined" ? null : globalThis;
    win?.addEventListener("resize", updateCategoryScrollState);
    return () => {
      el.removeEventListener("scroll", updateCategoryScrollState);
      win?.removeEventListener("resize", updateCategoryScrollState);
    };
  }, [updateCategoryScrollState, categoryMetas.length]);

  // Un segmento reservado (p. ej. `/finanzas`, `/admin`, `/offer` sin subruta) no es
  // una tienda: volvemos al feed en vez de mostrar "tienda no encontrada".
  if (!store && isReservedStoreName(storeName ?? "")) {
    return <Navigate to="/home" replace />;
  }

  if ((resolving || detailStatus === "loading") && !store && !notFound) {
    return (
      <div className="store-front-surface min-h-full bg-[#f7f3ef]">
        <div className="mx-auto max-w-[1140px] px-4 py-10 text-sm text-slate-500">
          Cargando tienda…
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="store-front-surface min-h-full bg-[#f7f3ef]">
        <div className="mx-auto max-w-[1140px] px-4 py-16 text-center">
          <p className="text-lg font-extrabold text-slate-900">
            Tienda no encontrada
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            onClick={() => nav("/home")}
          >
            <ArrowLeft size={16} aria-hidden /> Volver al feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <StorefrontChrome store={store} query={query} onQueryChange={setQuery}>
      <div className="mx-auto w-full max-w-[1140px] space-y-8 px-4 py-6 sm:py-8">
        {/* Banner principal (pitch de la tienda) */}
        <section aria-label="Banner principal" className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 -z-10 rounded-[60px] bg-slate-300/40 blur-3xl sm:-inset-12"
          />
          <div className="relative overflow-hidden rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-700 to-emerald-600 px-6 py-8 text-white sm:rounded-[28px] sm:px-10 sm:py-12">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">
              Tienda
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-extrabold leading-tight sm:text-3xl">
              {(catalog?.pitch ?? store.pitch ?? "").trim() ||
                `Bienvenido a ${store.name}. Explora nuestro catálogo.`}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              {store.location ? (
                <Link
                  to={storeMapHref(store)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-semibold text-white transition hover:bg-white/25"
                >
                  <MapPin size={15} aria-hidden /> Ver ubicación
                </Link>
              ) : null}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-semibold">
                {publishedProducts.length} productos
              </span>
            </div>
          </div>
        </section>

        {/* Explora por Categoría */}
        {categoryMetas.length > 0 ? (
          <section id="storefront-categorias" className="scroll-mt-24">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                  Explora por Categoría
                </h2>
                <p className="text-sm text-slate-500">
                  Filtra el catálogo por familia de productos.
                </p>
              </div>
            </div>

            <div className="relative -mx-4 sm:mx-0">
              <div
                ref={categoriesScrollerRef}
                className="store-no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 pt-0.5 [-webkit-overflow-scrolling:touch] sm:gap-4 sm:px-0"
                role="list"
                aria-label="Categorías"
              >
                <div className="w-[9.5rem] shrink-0 sm:w-40" role="listitem">
                  <CategoryTile
                    label="Todos"
                    active={activeCategory === ALL_CATEGORIES}
                    onClick={() => setActiveCategory(ALL_CATEGORIES)}
                  />
                </div>
                {categoryMetas.map((category) => (
                  <div
                    key={category.id}
                    className="w-[9.5rem] shrink-0 sm:w-40"
                    role="listitem"
                  >
                    <CategoryTile
                      label={category.label}
                      active={activeCategory === category.label}
                      onClick={() => setActiveCategory(category.label)}
                    />
                  </div>
                ))}
              </div>

              {categoryScroll.canLeft ? (
                <ScrollArrowButton
                  direction="left"
                  onClick={() => scrollCategories("left")}
                  aria-label="Desplazar categorías a la izquierda"
                />
              ) : null}

              {categoryScroll.canRight ? (
                <ScrollArrowButton
                  direction="right"
                  onClick={() => scrollCategories("right")}
                  aria-label="Desplazar categorías a la derecha"
                />
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Productos más recientes (solo al navegar sin filtro/búsqueda) */}
        {isBrowsingAll && latestProducts.length > 0 ? (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Productos más recientes
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
              {latestProducts.map((p) => (
                <StorefrontProductCard key={p.id} p={p} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Grid principal de productos */}
        <section>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              {mainHeading}
            </h2>
          </div>
          {visibleProducts.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-[#d9d5cf] bg-white px-4 py-10 text-center text-sm text-slate-500">
              {publishedProducts.length === 0
                ? "Esta tienda todavía no publicó productos."
                : "Ningún producto coincide con tu búsqueda."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
              {visibleProducts.map((p) => (
                <StorefrontProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>

        {/* Servicios */}
        {publishedServices.length > 0 ? (
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Servicios
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {publishedServices.map((s) => (
                <ServiceDetailCard key={s.id} s={s} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </StorefrontChrome>
  );
}

/**
 * Ficha de categoría del carrusel. Réplica del `CategoryTile` de referencia
 * (frontend-guest, `catalogUi.tsx`); aquí actúa como filtro (botón) en vez de
 * enlace, porque el catálogo es de una sola tienda.
 */
function CategoryTile({
  label,
  active,
  onClick,
}: Readonly<{
  label: string;
  active: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full w-full items-center justify-center rounded-[20px] border px-4 py-5 text-center transition ${
        active
          ? "border-emerald-700 bg-emerald-700 text-white shadow-[0_18px_34px_rgba(5,150,105,0.25)]"
          : "border-[#d9d5cf] bg-white text-emerald-700 hover:border-emerald-300"
      }`}
    >
      <div className="text-sm font-bold">{label}</div>
    </button>
  );
}
