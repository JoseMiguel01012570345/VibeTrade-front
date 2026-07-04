import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStorePageDetail } from "@features/market/hooks/useStorePageDetail";
import { useStoreIdFromName } from "@features/market/hooks/useStoreByName";
import { isReservedStoreName } from "@features/market/logic/store/storePath";
import { StorefrontChrome } from "../components/StorefrontChrome";
import { StorefrontHeroBanner } from "../components/StorefrontHeroBanner";
import { StorefrontCategorySection } from "../components/StorefrontCategorySection";
import { StorefrontLatestProductsSection } from "../components/StorefrontLatestProductsSection";
import { StorefrontSearchResultsSection } from "../components/StorefrontSearchResultsSection";
import { StorefrontProductsSection } from "../components/StorefrontProductsSection";
import { StorefrontServicesSection } from "../components/StorefrontServicesSection";
import {
  StorefrontLoadingState,
  StorefrontNotFoundState,
} from "../components/StorefrontPageStates";
import { useStoreCatalogSearch } from "../hooks/useStoreCatalogSearch";
import { LATEST_PRODUCTS_COUNT } from "../logic/storefrontConstants";
import type { CategoryMeta } from "../logic/storefrontTypes";

/**
 * Storefront (vista de cliente) de una tienda. Se muestra a cualquier visitante
 * que entra a `/store/:storeId` desde el feed, la búsqueda o el perfil de otro.
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState("");
  const submittedQuery = (searchParams.get("q") ?? "").trim();

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [storeId, searchParams]);

  const catalogSearch = useStoreCatalogSearch(storeId, submittedQuery);

  const handleSearchSubmit = useCallback(
    (term: string) => {
      const next = new URLSearchParams(searchParams);
      const trimmed = term.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

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
    if (!submittedQuery) return publishedProducts;
    return (catalogSearch.data?.products ?? []).filter((p) => p.published);
  }, [publishedProducts, submittedQuery, catalogSearch.data?.products]);

  const visibleServices = useMemo(() => {
    if (!submittedQuery) return publishedServices;
    return (catalogSearch.data?.services ?? []).filter((s) => s.published !== false);
  }, [publishedServices, submittedQuery, catalogSearch.data?.services]);

  const isBrowsingAll = !submittedQuery;
  const isSearchLoading = submittedQuery.length > 0 && catalogSearch.isLoading;
  const latestProducts = useMemo(
    () => publishedProducts.slice(0, LATEST_PRODUCTS_COUNT),
    [publishedProducts],
  );

  if (!store && isReservedStoreName(storeName ?? "")) {
    return <Navigate to="/home" replace />;
  }

  if ((resolving || detailStatus === "loading") && !store && !notFound) {
    return <StorefrontLoadingState />;
  }

  if (!store) {
    return <StorefrontNotFoundState onBack={() => nav("/home")} />;
  }

  return (
    <StorefrontChrome
      store={store}
      query={query}
      onQueryChange={setQuery}
      onSearchSubmit={handleSearchSubmit}
    >
      <div className="mx-auto w-full max-w-[1140px] space-y-8 px-4 py-6 sm:py-8">
        <StorefrontHeroBanner
          store={store}
          pitch={(catalog?.pitch ?? store.pitch ?? "").trim()}
          productCount={publishedProducts.length}
        />

        {isBrowsingAll ? (
          <StorefrontCategorySection
            store={store}
            productCategoryMetas={productCategoryMetas}
            serviceCategoryMetas={serviceCategoryMetas}
          />
        ) : null}

        {isBrowsingAll ? (
          <StorefrontLatestProductsSection products={latestProducts} />
        ) : null}

        {submittedQuery ? (
          <StorefrontSearchResultsSection
            products={visibleProducts}
            services={visibleServices}
            loading={isSearchLoading}
          />
        ) : (
          <>
            <StorefrontProductsSection
              heading="Ofertas que no puedes dejar pasar"
              products={visibleProducts}
              hasAnyPublished={publishedProducts.length > 0}
            />

            {publishedServices.length > 0 ? (
              <StorefrontServicesSection
                heading="Servicios"
                services={visibleServices}
              />
            ) : null}
          </>
        )}
      </div>
    </StorefrontChrome>
  );
}
