import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStorePageDetail } from "@features/market/hooks/useStorePageDetail";
import { useStoreIdFromName } from "@features/market/hooks/useStoreByName";
import { isReservedStoreName } from "@features/market/logic/store/storePath";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import { StorefrontChrome } from "../components/StorefrontChrome";
import { BannerSlider } from "../components/BannerSlider";
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
import { useStoreBanners } from "../context/StoreBannersContext";
import { useStoreCategories } from "../context/StoreCategoriesContext";
import { useStoreCatalogSearch } from "../hooks/useStoreCatalogSearch";
import {
  BANNER_IMG_CLASS,
  BANNER_MOBILE_EDGE_CLASS,
  BANNER_SLIDE_CLASS,
} from "../logic/catalogPageConfig";
import { LATEST_PRODUCTS_COUNT } from "../logic/storefrontConstants";
import type { CategoryMeta } from "../logic/storefrontTypes";

function StorefrontCatalogBody({ store }: Readonly<{ store: StoreBadge }>) {
  const catalog = useMarketStore((s) => s.storeCatalogs[store.id]);
  const [searchParams] = useSearchParams();
  const submittedQuery = (searchParams.get("q") ?? "").trim();
  const catalogSearch = useStoreCatalogSearch(store.id, submittedQuery);
  const { mainBanners, secondaryBanners } = useStoreBanners();
  const { categoryMetas } = useStoreCategories();

  const publishedProducts = useMemo(
    () => (catalog?.products ?? []).filter((p) => p.published),
    [catalog],
  );
  const publishedServices = useMemo(
    () => (catalog?.services ?? []).filter((s) => s.published !== false),
    [catalog],
  );

  const serviceCategoryMetas: CategoryMeta[] = useMemo(() => {
    const unique = Array.from(
      new Set(
        publishedServices.map((s) => s.category.trim()).filter(Boolean),
      ),
    );
    return unique.map((label) => ({
      id: label,
      label,
      slug: label,
      description: "Explora servicios en esta categoría.",
      icon: null,
    }));
  }, [publishedServices]);

  const visibleProducts = useMemo(() => {
    if (!submittedQuery) return publishedProducts;
    return (catalogSearch.data?.products ?? []).filter((p) => p.published);
  }, [publishedProducts, submittedQuery, catalogSearch.data?.products]);

  const visibleServices = useMemo(() => {
    if (!submittedQuery) return publishedServices;
    return (catalogSearch.data?.services ?? []).filter(
      (s) => s.published !== false,
    );
  }, [publishedServices, submittedQuery, catalogSearch.data?.services]);

  const isBrowsingAll = !submittedQuery;
  const isSearchLoading = submittedQuery.length > 0 && catalogSearch.isLoading;
  const latestProducts = useMemo(
    () => publishedProducts.slice(0, LATEST_PRODUCTS_COUNT),
    [publishedProducts],
  );

  const mainBannerSlides = useMemo(
    () =>
      mainBanners.map((b) => ({
        id: b.id,
        src: b.mediaUrl,
        alt: "Banner principal del catálogo",
      })),
    [mainBanners],
  );

  const secondaryBannerSlides = useMemo(
    () =>
      secondaryBanners.map((b) => ({
        id: b.id,
        src: b.mediaUrl,
        alt: "Banner promocional",
      })),
    [secondaryBanners],
  );

  return (
    <div className="mx-auto w-full max-w-[1140px] space-y-8 px-4 py-6 sm:py-8">
      {mainBannerSlides.length > 0 ? (
        <section aria-label="Banner principal" className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 -z-10 rounded-[60px] bg-slate-300/55 blur-3xl sm:-inset-12 lg:-inset-16"
          />
          <div
            className={`overflow-hidden rounded-[24px] sm:rounded-[28px] lg:rounded-[30px] ${BANNER_MOBILE_EDGE_CLASS}`}
          >
            <BannerSlider
              slides={mainBannerSlides}
              ariaLabel="Banner principal"
              onSlideClick={() =>
                globalThis.scrollTo({ top: 620, behavior: "smooth" })
              }
              slideClassName={BANNER_SLIDE_CLASS}
              imgClassName={BANNER_IMG_CLASS}
              showDots={false}
            />
          </div>
        </section>
      ) : (
        <StorefrontHeroBanner
          store={store}
          pitch={(catalog?.pitch ?? store.pitch ?? "").trim()}
          productCount={publishedProducts.length}
        />
      )}

      {isBrowsingAll ? (
        <StorefrontCategorySection
          store={store}
          productCategoryMetas={categoryMetas}
          serviceCategoryMetas={serviceCategoryMetas}
        />
      ) : null}

      {isBrowsingAll ? (
        <StorefrontLatestProductsSection products={latestProducts} />
      ) : null}

      {isBrowsingAll && secondaryBannerSlides.length > 0 ? (
        <section aria-label="Promociones" className="relative">
          <div
            className={`relative isolate overflow-hidden rounded-[22px] ${BANNER_MOBILE_EDGE_CLASS}`}
          >
            <BannerSlider
              slides={secondaryBannerSlides}
              ariaLabel="Promociones"
              slideClassName={BANNER_SLIDE_CLASS}
              imgClassName={BANNER_IMG_CLASS}
            />
          </div>
        </section>
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
  );
}

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
  const [loadNonce] = useState(0);
  const { detailStatus } = useStorePageDetail(storeId, me.id, loadNonce);
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [storeId, searchParams]);

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
      <StorefrontCatalogBody store={store} />
    </StorefrontChrome>
  );
}
