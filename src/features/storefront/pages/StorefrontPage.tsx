import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, MapPin, Wrench } from "lucide-react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStorePageDetail } from "@features/market/hooks/useStorePageDetail";
import { useStoreIdFromName } from "@features/market/hooks/useStoreByName";
import {
  isReservedStoreName,
  storeCategoryHref,
  storeMapHref,
  storeServiceCategoryHref,
} from "@features/market/logic/store/storePath";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import type {
  StoreProduct,
  StoreService,
} from "@features/market/logic/storeCatalogTypes";
import { StorefrontServiceCard } from "../components/StorefrontServiceCard";
import { StorefrontProductCard } from "../components/StorefrontProductCard";
import { ScrollArrowButton } from "../components/ScrollArrowButton";
import { StorefrontChrome } from "../components/StorefrontChrome";

const LATEST_PRODUCTS_COUNT = 4;

/** Familia (categoría) para los carruseles de categorías (por tienda). */
type CategoryMeta = { id: string; label: string; slug: string };

/**
 * Storefront (vista de cliente) de una tienda. Se muestra a cualquier visitante
 * que entra a `/store/:storeId` desde el feed, la búsqueda o el perfil de otro.
 * Réplica de la UI/UX del catálogo de la app de referencia (frontend-guest,
 * `src/pages/Catalog.tsx`): carrusel "Explora por Categoría" con flechas de
 * desplazamiento, "Productos más recientes" y grid "Ofertas que no puedes dejar
 * pasar". Las categorías (productos y servicios) llevan a su página dedicada.
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

  /**
   * El término puede llegar por URL (`?q=`) al buscar desde otra vista (p. ej. el
   * detalle). Navegar por categoría abre su página dedicada (`/{tienda}/categoria/…`
   * o `/{tienda}/servicios/…`), no un filtro en esta pantalla.
   */
  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [storeId, searchParams]);

  const publishedProducts = useMemo(
    () => (catalog?.products ?? []).filter((p) => p.published),
    [catalog],
  );
  const publishedServices = useMemo(
    () => (catalog?.services ?? []).filter((s) => s.published !== false),
    [catalog],
  );

  const productCategoryMetas: CategoryMeta[] = useMemo(() => {
    const fromProducts = publishedProducts
      .map((p) => p.category.trim())
      .filter(Boolean);
    const fromStore = (store?.categories ?? [])
      .map((c) => c.trim())
      .filter(Boolean);
    const unique = Array.from(new Set([...fromStore, ...fromProducts]));
    return unique.map((label) => ({ id: label, label, slug: label }));
  }, [publishedProducts, store]);

  const serviceCategoryMetas: CategoryMeta[] = useMemo(() => {
    const unique = Array.from(
      new Set(
        publishedServices.map((s) => s.category.trim()).filter(Boolean),
      ),
    );
    return unique.map((label) => ({ id: label, label, slug: label }));
  }, [publishedServices]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return publishedProducts;
    return publishedProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [publishedProducts, query]);

  const visibleServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return publishedServices;
    return publishedServices.filter(
      (s) =>
        s.tipoServicio.toLowerCase().includes(q) ||
        s.descripcion.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [publishedServices, query]);

  const isBrowsingAll = !query.trim();
  const latestProducts = useMemo(
    () => publishedProducts.slice(0, LATEST_PRODUCTS_COUNT),
    [publishedProducts],
  );

  const mainHeading = isBrowsingAll
    ? "Ofertas que no puedes dejar pasar"
    : "Resultados";

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

        {/* Explora por Categoría: al tocar una categoría se entra a su página dedicada */}
        <StorefrontCategorySection
          store={store}
          productCategoryMetas={productCategoryMetas}
          serviceCategoryMetas={serviceCategoryMetas}
        />

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
        <StorefrontProductsSection
          heading={mainHeading}
          products={visibleProducts}
          hasAnyPublished={publishedProducts.length > 0}
        />

        {/* Servicios */}
        {publishedServices.length > 0 ? (
          <StorefrontServicesSection
            heading={isBrowsingAll ? "Servicios" : "Resultados"}
            services={visibleServices}
          />
        ) : null}
      </div>
    </StorefrontChrome>
  );
}

/** Sección "Explora por Categoría": carruseles de categorías de productos y servicios. */
function StorefrontCategorySection({
  store,
  productCategoryMetas,
  serviceCategoryMetas,
}: Readonly<{
  store: StoreBadge;
  productCategoryMetas: CategoryMeta[];
  serviceCategoryMetas: CategoryMeta[];
}>) {
  if (productCategoryMetas.length === 0 && serviceCategoryMetas.length === 0) {
    return null;
  }
  return (
    <section id="storefront-categorias" className="scroll-mt-24 space-y-6">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Explora por Categoría
        </h2>
        <p className="text-sm text-slate-500">
          Entra a una familia de productos o servicios y navega su catálogo
          dedicado.
        </p>
      </div>

      {productCategoryMetas.length > 0 ? (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Productos
          </p>
          <CategoryTileCarousel
            categories={productCategoryMetas}
            hrefFor={(category) => storeCategoryHref(store, category.label)}
            ariaLabel="Categorías de productos"
            kind="product"
          />
        </div>
      ) : null}

      {serviceCategoryMetas.length > 0 ? (
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Servicios
          </p>
          <CategoryTileCarousel
            categories={serviceCategoryMetas}
            hrefFor={(category) =>
              storeServiceCategoryHref(store, category.label)
            }
            ariaLabel="Categorías de servicios"
            kind="service"
          />
        </div>
      ) : null}
    </section>
  );
}

/** Grid principal de productos (todos los publicados o el resultado de la búsqueda). */
function StorefrontProductsSection({
  heading,
  products,
  hasAnyPublished,
}: Readonly<{
  heading: string;
  products: StoreProduct[];
  hasAnyPublished: boolean;
}>) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          {heading}
        </h2>
      </div>
      {products.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-[#d9d5cf] bg-white px-4 py-10 text-center text-sm text-slate-500">
          {hasAnyPublished
            ? "Ningún producto coincide con tu búsqueda."
            : "Esta tienda todavía no publicó productos."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
          {products.map((p) => (
            <StorefrontProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Grid de servicios (todos los publicados o el resultado de la búsqueda). */
function StorefrontServicesSection({
  heading,
  services,
}: Readonly<{
  heading: string;
  services: StoreService[];
}>) {
  return (
    <section id="storefront-servicios" className="scroll-mt-24">
      <div className="mb-5">
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          {heading}
        </h2>
      </div>
      {services.length === 0 ? (
        <p className="rounded-[18px] border border-dashed border-[#d9d5cf] bg-white px-4 py-10 text-center text-sm text-slate-500">
          Ningún servicio coincide con tu búsqueda.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
          {services.map((s) => (
            <StorefrontServiceCard key={s.id} s={s} />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Carrusel horizontal de fichas de categoría con flechas de desplazamiento (réplica
 * del carrusel "Explora por Categoría" de la app de referencia). Cada ficha es un
 * enlace a la página dedicada de esa categoría (productos o servicios).
 */
function CategoryTileCarousel({
  categories,
  hrefFor,
  ariaLabel,
  kind,
}: Readonly<{
  categories: CategoryMeta[];
  hrefFor: (category: CategoryMeta) => string;
  ariaLabel: string;
  kind: "product" | "service";
}>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({
    canLeft: false,
    canRight: false,
  });

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const canLeft = el.scrollLeft > 1;
    const canRight = el.scrollLeft < maxScroll - 1;
    setScrollState((prev) =>
      prev.canLeft === canLeft && prev.canRight === canRight
        ? prev
        : { canLeft, canRight },
    );
  }, []);

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 200);
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const win = typeof globalThis === "undefined" ? null : globalThis;
    win?.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      win?.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, categories.length]);

  return (
    <div className="relative -mx-4 sm:mx-0">
      <div
        ref={scrollerRef}
        className="store-no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 pt-0.5 [-webkit-overflow-scrolling:touch] sm:gap-4 sm:px-0"
        role="list"
        aria-label={ariaLabel}
      >
        {categories.map((category) => (
          <div
            key={category.id}
            className="w-[9.5rem] shrink-0 sm:w-40"
            role="listitem"
          >
            <CategoryTileLink
              label={category.label}
              to={hrefFor(category)}
              kind={kind}
            />
          </div>
        ))}
      </div>

      {scrollState.canLeft ? (
        <ScrollArrowButton
          direction="left"
          onClick={() => scrollBy("left")}
          aria-label="Desplazar categorías a la izquierda"
        />
      ) : null}

      {scrollState.canRight ? (
        <ScrollArrowButton
          direction="right"
          onClick={() => scrollBy("right")}
          aria-label="Desplazar categorías a la derecha"
        />
      ) : null}
    </div>
  );
}

/**
 * Ficha de categoría del carrusel. Réplica del `CategoryTile` de referencia
 * (frontend-guest, `catalogUi.tsx`): enlace que lleva a la página de la categoría.
 * Los servicios llevan un icono de herramienta para diferenciarse de los productos.
 */
function CategoryTileLink({
  label,
  to,
  kind,
}: Readonly<{
  label: string;
  to: string;
  kind: "product" | "service";
}>) {
  return (
    <Link
      to={to}
      className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[20px] border border-[#d9d5cf] bg-white px-4 py-5 text-center text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_34px_rgba(5,150,105,0.12)]"
    >
      {kind === "service" ? (
        <Wrench className="h-5 w-5 shrink-0" aria-hidden />
      ) : null}
      <span className="text-sm font-bold">{label}</span>
    </Link>
  );
}
