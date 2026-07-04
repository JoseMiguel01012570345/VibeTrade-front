import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Wrench } from "lucide-react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStorePageDetail } from "@features/market/hooks/useStorePageDetail";
import { useStoreIdFromName } from "@features/market/hooks/useStoreByName";
import {
  isReservedStoreName,
  storeCategoryHref,
  storeHref,
  storeServiceCategoryHref,
} from "@features/market/logic/store/storePath";
import { parseProductPriceNumber } from "@features/market/logic/parseProductPrice";
import type {
  StoreProduct,
  StoreService,
} from "@features/market/logic/storeCatalogTypes";
import { StorefrontChrome } from "../components/StorefrontChrome";
import { StorefrontProductCard } from "../components/StorefrontProductCard";
import { StorefrontServiceCard } from "../components/StorefrontServiceCard";

/** A qué catálogo pertenece la página de categoría. */
type CategoryKind = "product" | "service";

const PAGE_SIZE = 12;

type SortMode = "price-asc" | "price-desc" | "name-asc" | "name-desc";

/** Opciones de ordenamiento por tipo de catálogo (los servicios no tienen precio comparable). */
const PRODUCT_SORTS: { value: SortMode; label: string }[] = [
  { value: "price-asc", label: "Precio : Menor a Mayor" },
  { value: "price-desc", label: "Precio : Mayor a Menor" },
  { value: "name-asc", label: "Nombre : A-Z" },
];
const SERVICE_SORTS: { value: SortMode; label: string }[] = [
  { value: "name-asc", label: "Nombre : A-Z" },
  { value: "name-desc", label: "Nombre : Z-A" },
];

function decodeCategoryParam(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sortStoreProducts(
  products: StoreProduct[],
  sort: SortMode,
): StoreProduct[] {
  const copy = [...products];
  if (sort === "price-asc") {
    copy.sort(
      (a, b) =>
        (parseProductPriceNumber(a.price) ?? Number.POSITIVE_INFINITY) -
        (parseProductPriceNumber(b.price) ?? Number.POSITIVE_INFINITY),
    );
  } else if (sort === "price-desc") {
    copy.sort(
      (a, b) =>
        (parseProductPriceNumber(b.price) ?? Number.NEGATIVE_INFINITY) -
        (parseProductPriceNumber(a.price) ?? Number.NEGATIVE_INFINITY),
    );
  } else if (sort === "name-desc") {
    copy.sort((a, b) => b.name.localeCompare(a.name, "es"));
  } else {
    copy.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  return copy;
}

function serviceTitle(s: StoreService): string {
  return s.nombreServicio.trim() || s.category.trim() || "Servicio";
}

function sortStoreServices(
  services: StoreService[],
  sort: SortMode,
): StoreService[] {
  const copy = [...services];
  if (sort === "name-desc") {
    copy.sort((a, b) => serviceTitle(b).localeCompare(serviceTitle(a), "es"));
  } else {
    copy.sort((a, b) => serviceTitle(a).localeCompare(serviceTitle(b), "es"));
  }
  return copy;
}

/**
 * Página dedicada de una categoría de la tienda (réplica de la UI/UX del
 * `CategoryCatalog` de la app de referencia): breadcrumb, título de la categoría,
 * selector de ordenamiento, grid paginado y, al pie, las pestañas del resto de
 * categorías del mismo catálogo. Sirve tanto para productos (`kind="product"`,
 * `/{tienda}/categoria/{cat}`) como para servicios (`kind="service"`,
 * `/{tienda}/servicios/{cat}`). Se llega desde el carrusel "Explora por Categoría"
 * del storefront o desde el menú de categorías.
 */
export function StorefrontCategoryPage({
  kind,
}: Readonly<{ kind: CategoryKind }>) {
  const { storeName, cat } = useParams();
  const nav = useNavigate();
  const category = decodeCategoryParam(cat);

  const me = useAppStore((s) => s.me);
  const { storeId, resolving, notFound } = useStoreIdFromName(storeName, me.id);
  const store = useMarketStore((s) => (storeId ? s.stores[storeId] : undefined));
  const catalog = useMarketStore((s) =>
    storeId ? s.storeCatalogs[storeId] : undefined,
  );
  const [loadNonce] = useState(0);
  const { detailStatus } = useStorePageDetail(storeId, me.id, loadNonce);

  const isService = kind === "service";
  const sortOptions = isService ? SERVICE_SORTS : PRODUCT_SORTS;

  const [sort, setSort] = useState<SortMode>(sortOptions[0].value);
  const [page, setPage] = useState(1);

  const publishedProducts = useMemo(
    () => (catalog?.products ?? []).filter((p) => p.published),
    [catalog],
  );
  const publishedServices = useMemo(
    () => (catalog?.services ?? []).filter((s) => s.published !== false),
    [catalog],
  );

  /** Categorías del mismo catálogo (para las pestañas del pie). */
  const productCategories = useMemo(() => {
    const fromStore = (store?.categories ?? [])
      .map((c) => c.trim())
      .filter(Boolean);
    const fromProducts = publishedProducts
      .map((p) => p.category.trim())
      .filter(Boolean);
    return Array.from(new Set([...fromStore, ...fromProducts]));
  }, [store, publishedProducts]);
  const serviceCategories = useMemo(
    () =>
      Array.from(
        new Set(
          publishedServices.map((s) => s.category.trim()).filter(Boolean),
        ),
      ),
    [publishedServices],
  );
  const categories = isService ? serviceCategories : productCategories;

  const filteredProducts = useMemo(
    () => publishedProducts.filter((p) => p.category.trim() === category),
    [publishedProducts, category],
  );
  const filteredServices = useMemo(
    () => publishedServices.filter((s) => s.category.trim() === category),
    [publishedServices, category],
  );

  const sortedProducts = useMemo(
    () => sortStoreProducts(filteredProducts, sort),
    [filteredProducts, sort],
  );

  const sortedServices = useMemo(
    () => sortStoreServices(filteredServices, sort),
    [filteredServices, sort],
  );

  const total = isService ? sortedServices.length : sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageProducts = sortedProducts.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const pageServices = sortedServices.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const selectedSortLabel =
    sortOptions.find((o) => o.value === sort)?.label ?? sortOptions[0].label;

  useEffect(() => {
    setPage(1);
  }, [category, sort, kind]);

  // Un segmento reservado no es una tienda: volvemos al feed.
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

  const storeHome = storeHref(store);
  const hrefForCategory = (name: string) =>
    isService
      ? storeServiceCategoryHref(store, name)
      : storeCategoryHref(store, name);
  const title = category || (isService ? "Servicios" : "Categoría");

  return (
    <StorefrontChrome store={store}>
      <div className="mx-auto w-full max-w-[1140px] space-y-10 px-4 py-6 sm:py-8">
        <CategoryHeader
          storeHome={storeHome}
          title={title}
          isService={isService}
          sortOptions={sortOptions}
          sort={sort}
          onSortChange={setSort}
          selectedSortLabel={selectedSortLabel}
        />

        <CategoryGrid
          isService={isService}
          products={pageProducts}
          services={pageServices}
        />

        <CategoryPagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
        />

        <CategoryFooterTabs
          categories={categories}
          current={category}
          isService={isService}
          hrefFor={hrefForCategory}
        />
      </div>
    </StorefrontChrome>
  );
}

/** Breadcrumb + título de la categoría + selector de ordenamiento. */
function CategoryHeader({
  storeHome,
  title,
  isService,
  sortOptions,
  sort,
  onSortChange,
  selectedSortLabel,
}: Readonly<{
  storeHome: string;
  title: string;
  isService: boolean;
  sortOptions: { value: SortMode; label: string }[];
  sort: SortMode;
  onSortChange: (value: SortMode) => void;
  selectedSortLabel: string;
}>) {
  return (
    <section className="rounded-[32px] border border-[#ece4dc] bg-[#fbfaf8] px-4 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
      <div className="mb-8 flex items-center gap-2 text-sm text-slate-400 sm:mb-10">
        <Link to={storeHome} className="transition hover:text-emerald-700">
          Inicio
        </Link>
        <span aria-hidden>›</span>
        <span className="min-w-0 truncate font-semibold text-slate-700">
          {title}
        </span>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 break-words text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-[3rem]">
            {isService ? (
              <Wrench
                className="h-7 w-7 shrink-0 text-emerald-700 lg:h-10 lg:w-10"
                aria-hidden
              />
            ) : null}
            {title}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
            {isService
              ? "Explora servicios en esta categoría."
              : "Explora productos en esta categoría."}
          </p>
        </div>

        <div className="flex flex-col gap-3 text-sm font-semibold text-slate-700 sm:flex-row sm:items-center">
          <span className="text-sm font-bold text-slate-700">Ordenar por:</span>
          <CategorySortControl
            options={sortOptions}
            value={sort}
            onChange={onSortChange}
            selectedLabel={selectedSortLabel}
          />
        </div>
      </div>
    </section>
  );
}

/** Menú desplegable de ordenamiento (réplica del selector de la app de referencia). */
function CategorySortControl({
  options,
  value,
  onChange,
  selectedLabel,
}: Readonly<{
  options: { value: SortMode; label: string }[];
  value: SortMode;
  onChange: (value: SortMode) => void;
  selectedLabel: string;
}>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative min-w-0 w-full max-w-sm sm:max-w-none">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-14 w-full items-center justify-between gap-4 rounded-[16px] border border-[#d9d5cf] bg-white px-5 text-sm font-semibold text-slate-700 shadow-[0_10px_24px_rgba(33,37,41,0.04)] transition hover:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.55rem)] z-20 w-full min-w-[15rem] overflow-hidden rounded-[18px] border border-[#e5ddd5] bg-white p-2 shadow-[0_20px_44px_rgba(33,37,41,0.12)]">
          <div className="space-y-1" role="listbox" aria-label="Ordenar">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-[12px] px-4 py-3 text-left text-sm font-medium transition ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-700 hover:bg-stone-50"
                  }`}
                  role="option"
                  aria-selected={active}
                >
                  <span>{option.label}</span>
                  {active ? (
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Grid paginado de fichas (productos o servicios) o mensaje de categoría vacía. */
function CategoryGrid({
  isService,
  products,
  services,
}: Readonly<{
  isService: boolean;
  products: StoreProduct[];
  services: StoreService[];
}>) {
  const isEmpty = isService ? services.length === 0 : products.length === 0;
  if (isEmpty) {
    return (
      <section>
        <p className="rounded-[18px] border border-dashed border-[#d9d5cf] bg-white px-5 py-10 text-center text-sm text-slate-500">
          {isService
            ? "No hay servicios disponibles en esta categoría."
            : "No hay productos disponibles en esta categoría."}
        </p>
      </section>
    );
  }
  return (
    <section>
      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        {isService
          ? services.map((s) => <StorefrontServiceCard key={s.id} s={s} />)
          : products.map((p) => <StorefrontProductCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

/** Barra de paginación numérica (‹ 1 2 … ›). No se muestra con una sola página. */
function CategoryPagination({
  page,
  totalPages,
  onChange,
}: Readonly<{
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}>) {
  if (totalPages <= 1) return null;
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <section className="flex justify-center">
      <nav className="flex items-center gap-2" aria-label="Paginación de categoría">
        <PaginationArrow
          direction="prev"
          disabled={page <= 1}
          onClick={() => onChange(Math.max(1, page - 1))}
        />
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onChange(pageNumber)}
            className={`inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-full px-3 text-sm font-bold transition ${
              pageNumber === page
                ? "bg-emerald-700 text-white shadow-sm"
                : "border border-[#d9d5cf] bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            }`}
            aria-current={pageNumber === page ? "page" : undefined}
          >
            {pageNumber}
          </button>
        ))}
        <PaginationArrow
          direction="next"
          disabled={page >= totalPages}
          onClick={() => onChange(Math.min(totalPages, page + 1))}
        />
      </nav>
    </section>
  );
}

/** Pestañas del resto de categorías del mismo catálogo (pie de la página). */
function CategoryFooterTabs({
  categories,
  current,
  isService,
  hrefFor,
}: Readonly<{
  categories: string[];
  current: string;
  isService: boolean;
  hrefFor: (name: string) => string;
}>) {
  if (categories.length === 0) return null;
  return (
    <section className="relative -mx-4 sm:mx-0">
      <div
        className="store-no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 pt-1 [-webkit-overflow-scrolling:touch] sm:gap-3 sm:px-0"
        role="list"
        aria-label={isService ? "Más categorías de servicios" : "Más categorías"}
      >
        {categories.map((name) => {
          const active = name === current;
          return (
            <Link
              key={name}
              to={hrefFor(name)}
              role="listitem"
              className={`flex min-h-[2.75rem] min-w-[8.25rem] max-w-[11rem] shrink-0 items-center justify-center gap-1.5 rounded-[16px] border px-3 py-2 text-center text-xs font-bold leading-snug transition sm:min-w-[9.5rem] sm:max-w-none sm:px-4 sm:py-4 sm:text-sm ${
                active
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-[#d9d5cf] bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              {isService ? (
                <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : null}
              {name}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Flecha de paginación (‹ / ›) con estilo consistente con las pestañas. */
function PaginationArrow({
  direction,
  disabled,
  onClick,
}: Readonly<{
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d5cf] bg-white text-lg font-bold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={direction === "prev" ? "Página anterior" : "Página siguiente"}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}
