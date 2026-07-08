import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStorePageDetail } from "@features/market/hooks/useStorePageDetail";
import { useStoreIdFromName } from "@features/market/hooks/useStoreByName";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import type { StoreProduct, StoreService } from "@features/market/Dtos/storeCatalogTypes";
import {
  isReservedStoreName,
  storeCategoryHref,
  storeHref,
  storeServiceCategoryHref,
} from "@features/market/logic/store/storePath";
import { StorefrontChrome } from "../components/StorefrontChrome";
import { StorefrontProductModal } from "../components/StorefrontProductModal";
import { StorefrontServiceModal } from "../components/StorefrontServiceModal";
import { CategoryHeader } from "../components/CategoryHeader";
import { CategoryGrid } from "../components/CategoryGrid";
import { CategoryPagination } from "../components/CategoryPagination";
import { CategoryFooterTabs } from "../components/CategoryFooterTabs";
import {
  StorefrontLoadingState,
  StorefrontNotFoundState,
} from "../components/StorefrontPageStates";
import { useStoreCategories } from "../context/StoreCategoriesContext";
import { findGuestCategoryMetaBySlug } from "../logic/categoryTree/buildGuestCategoryMetas";
import { leafDescendantsUnderRoot } from "../logic/categoryTree/guestCategoryTree";
import {
  decodeCategoryParam,
  PRODUCT_SORTS,
  SERVICE_SORTS,
  sortStoreProducts,
  sortStoreServices,
} from "../logic/categorySort";
import { CATEGORY_PAGE_SIZE } from "../logic/storefrontConstants";
import type { CategoryKind, SortMode } from "../logic/storefrontTypes";

function productMatchesCategoryIds(
  product: StoreProduct,
  targetIds: ReadonlySet<string>,
  labelFallback: string,
): boolean {
  if (product.categoryIds?.some((id) => targetIds.has(id))) return true;
  if (!labelFallback) return false;
  return product.category.trim() === labelFallback;
}

function StorefrontCategoryPageBody({
  store,
  kind,
  categoryParam,
}: Readonly<{
  store: StoreBadge;
  kind: CategoryKind;
  categoryParam: string;
}>) {
  const catalog = useMarketStore((s) => s.storeCatalogs[store.id]);
  const { categories, categoryMetas } = useStoreCategories();
  const isService = kind === "service";
  const sortOptions = isService ? SERVICE_SORTS : PRODUCT_SORTS;

  const [sort, setSort] = useState<SortMode>(sortOptions[0].value);
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [selectedService, setSelectedService] = useState<StoreService | null>(null);

  const publishedProducts = useMemo(
    () => (catalog?.products ?? []).filter((p) => p.published),
    [catalog],
  );
  const publishedServices = useMemo(
    () => (catalog?.services ?? []).filter((s) => s.published !== false),
    [catalog],
  );

  const productMeta = useMemo(
    () =>
      !isService && categoryParam
        ? findGuestCategoryMetaBySlug(categories, categoryParam)
        : null,
    [isService, categoryParam, categories],
  );

  const productTargetIds = useMemo(() => {
    if (isService || !productMeta) return new Set<string>();
    const leaves = leafDescendantsUnderRoot(productMeta.id, categories);
    const ids = leaves.length > 0 ? leaves.map((l) => l.id) : [productMeta.id];
    return new Set(ids);
  }, [isService, productMeta, categories]);

  const productCategories = useMemo(
    () => categoryMetas.map((m) => m.slug),
    [categoryMetas],
  );

  const serviceCategories = useMemo(
    () =>
      Array.from(
        new Set(
          publishedServices.map((s) => s.category.trim()).filter(Boolean),
        ),
      ),
    [publishedServices],
  );
  const tabCategories = isService ? serviceCategories : productCategories;

  const filteredProducts = useMemo(() => {
    if (isService) return [];
    if (productMeta) {
      return publishedProducts.filter((p) =>
        productMatchesCategoryIds(p, productTargetIds, productMeta.label),
      );
    }
    return publishedProducts.filter(
      (p) => p.category.trim() === categoryParam,
    );
  }, [
    isService,
    productMeta,
    publishedProducts,
    productTargetIds,
    categoryParam,
  ]);

  const filteredServices = useMemo(
    () =>
      publishedServices.filter((s) => s.category.trim() === categoryParam),
    [publishedServices, categoryParam],
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
  }, [categoryParam, sort, kind]);

  const storeHome = storeHref(store);
  const hrefForCategory = (nameOrSlug: string) =>
    isService
      ? storeServiceCategoryHref(store, nameOrSlug)
      : storeCategoryHref(store, nameOrSlug);
  const title =
    (isService ? categoryParam : productMeta?.label ?? categoryParam) ||
    (isService ? "Servicios" : "CategorÃ­a");
  const currentTab = isService
    ? categoryParam
    : (productMeta?.slug ?? categoryParam);

  return (
    <div className="w-full space-y-10 px-4 py-6 sm:py-8">
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
        onProductSelect={setSelectedProduct}
        onServiceSelect={setSelectedService}
      />

      <StorefrontProductModal
        product={selectedProduct}
        storeName={store.name}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      <StorefrontServiceModal
        service={selectedService}
        storeName={store.name}
        isOpen={!!selectedService}
        onClose={() => setSelectedService(null)}
      />

      <CategoryPagination
        page={page}
        totalPages={totalPages}
        onChange={setPage}
      />

      <CategoryFooterTabs
        categories={tabCategories}
        current={currentTab}
        isService={isService}
        hrefFor={hrefForCategory}
      />
    </div>
  );
}

/**
 * PÃ¡gina dedicada de una categorÃ­a de la tienda: breadcrumb, tÃ­tulo, ordenamiento,
 * grid paginado y pestaÃ±as del resto de categorÃ­as del mismo catÃ¡logo.
 */
export function StorefrontCategoryPage({
  kind,
}: Readonly<{ kind: CategoryKind }>) {
  const { storeName, cat } = useParams();
  const nav = useNavigate();
  const categoryParam = decodeCategoryParam(cat);

  const me = useAppStore((s) => s.me);
  const { storeId, resolving, notFound } = useStoreIdFromName(storeName, me.id);
  const store = useMarketStore((s) => (storeId ? s.stores[storeId] : undefined));
  const [loadNonce] = useState(0);
  const { detailStatus } = useStorePageDetail(storeId, me.id, loadNonce);

  if (!store && isReservedStoreName(storeName ?? "")) {
    return <Navigate to="/home" replace />;
  }

  if (!notFound && (resolving || detailStatus === "loading")) {
    return <StorefrontLoadingState />;
  }

  if (!store) {
    return <StorefrontNotFoundState onBack={() => nav("/home")} />;
  }

  return (
    <StorefrontChrome store={store}>
      <StorefrontCategoryPageBody
        store={store}
        kind={kind}
        categoryParam={categoryParam}
      />
    </StorefrontChrome>
  );
}

