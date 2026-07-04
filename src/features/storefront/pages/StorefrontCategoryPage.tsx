import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
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
import { StorefrontChrome } from "../components/StorefrontChrome";
import { CategoryHeader } from "../components/CategoryHeader";
import { CategoryGrid } from "../components/CategoryGrid";
import { CategoryPagination } from "../components/CategoryPagination";
import { CategoryFooterTabs } from "../components/CategoryFooterTabs";
import {
  StorefrontLoadingState,
  StorefrontNotFoundState,
} from "../components/StorefrontPageStates";
import {
  decodeCategoryParam,
  PRODUCT_SORTS,
  SERVICE_SORTS,
  sortStoreProducts,
  sortStoreServices,
} from "../logic/categorySort";
import { CATEGORY_PAGE_SIZE } from "../logic/storefrontConstants";
import type { CategoryKind, SortMode } from "../logic/storefrontTypes";

/**
 * Página dedicada de una categoría de la tienda: breadcrumb, título, ordenamiento,
 * grid paginado y pestañas del resto de categorías del mismo catálogo.
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
  const totalPages = Math.max(1, Math.ceil(total / CATEGORY_PAGE_SIZE));
  const pageProducts = sortedProducts.slice(
    (page - 1) * CATEGORY_PAGE_SIZE,
    page * CATEGORY_PAGE_SIZE,
  );
  const pageServices = sortedServices.slice(
    (page - 1) * CATEGORY_PAGE_SIZE,
    page * CATEGORY_PAGE_SIZE,
  );
  const selectedSortLabel =
    sortOptions.find((o) => o.value === sort)?.label ?? sortOptions[0].label;

  useEffect(() => {
    setPage(1);
  }, [category, sort, kind]);

  if (!store && isReservedStoreName(storeName ?? "")) {
    return <Navigate to="/home" replace />;
  }

  if ((resolving || detailStatus === "loading") && !store && !notFound) {
    return <StorefrontLoadingState />;
  }

  if (!store) {
    return <StorefrontNotFoundState onBack={() => nav("/home")} />;
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
