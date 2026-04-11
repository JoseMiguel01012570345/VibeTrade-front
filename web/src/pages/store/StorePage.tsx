import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useAppStore } from "../../app/store/useAppStore";
import { ArrowLeft, LayoutGrid, RefreshCw } from "lucide-react";
import { useMarketStore } from "../../app/store/useMarketStore";
import {
  catalogMonedasList,
  emptyStoreProductInput,
  emptyStoreServiceInput,
  mergeStoreCatalogWithLocalExtras,
} from "../chat/domain/storeCatalogTypes";
import { fetchStoreDetail } from "../../utils/market/fetchStoreDetail";
import {
  deleteStoreProductApi,
  deleteStoreServiceApi,
  putStoreProduct,
  putStoreService,
  setMarketHydrating,
} from "../../utils/market/marketPersistence";
import { fetchCatalogCategories } from "../../utils/market/fetchCatalogCategories";
import { fetchCurrencies } from "../../utils/market/fetchCurrencies";
import { ConfirmDeleteModal } from "../../components/ConfirmDeleteModal";
import { ScrollToTopFab } from "../../components/ScrollToTopFab";
import { ProductEditorModal } from "../profile/stores/ProductEditorModal";
import { ServiceEditorModal } from "../profile/stores/ServiceEditorModal";
import {
  OwnerCatalogProductList,
  OwnerCatalogServiceList,
} from "./StoreOwnerCatalogLists";
import {
  MAX_REASONABLE_PRICE,
  maxPriceFromProducts,
  maxPriceFromServices,
} from "../../utils/market/parseProductPrice";
import { ProductDetailCard } from "./ProductDetailCard";
import { ProductFiltersCard } from "./ProductFiltersCard";
import { ServiceDetailCard } from "./ServiceDetailCard";
import { ServiceFiltersCard } from "./ServiceFiltersCard";
import { StoreCatalogHubTile } from "./StoreCatalogHubTile";
import { StoreIdentityBlock } from "./StoreIdentityBlock";
import { VitrinaFiltersCard } from "./VitrinaFiltersCard";
import {
  applyProductPriceRangeAndSort,
  applyServicePriceRangeAndSort,
  collectCurrencyCodesForFilterOptions,
  filterProductsBySectionText,
  filterServicesBySectionText,
} from "./storePageCatalogFilters";
import { backRowBtnClass } from "./storePageStyles";
import type {
  CatalogPublishedFilter,
  PriceSort,
  StoreFilterSection,
  StoreScreen,
  StoreSectionFilters,
  VitrinaListMode,
} from "./storePageTypes";
import { emptyStoreSectionFilters } from "./storePageTypes";
import {
  clampStoreSectionPriceRange,
  formatCatalogJoinedLabel,
  pathForStoreScreen,
  screenFromPathname,
  storeScreenHeaderTitle,
  uniqueSorted,
} from "./storePageUtils";

const EMPTY_CATEGORY_HINTS: string[] = [];
const EMPTY_CURRENCY_HINTS: string[] = [];

export function StorePage() {
  const { storeId } = useParams();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const me = useAppStore((s) => s.me);
  const store = useMarketStore((s) =>
    storeId ? s.stores[storeId] : undefined,
  );
  const catalog = useMarketStore((s) =>
    storeId ? s.storeCatalogs[storeId] : undefined,
  );

  const addOwnerStoreProduct = useMarketStore((s) => s.addOwnerStoreProduct);
  const updateOwnerStoreProduct = useMarketStore(
    (s) => s.updateOwnerStoreProduct,
  );
  const removeOwnerStoreProduct = useMarketStore(
    (s) => s.removeOwnerStoreProduct,
  );
  const setOwnerStoreProductPublished = useMarketStore(
    (s) => s.setOwnerStoreProductPublished,
  );
  const addOwnerStoreService = useMarketStore((s) => s.addOwnerStoreService);
  const updateOwnerStoreService = useMarketStore(
    (s) => s.updateOwnerStoreService,
  );
  const removeOwnerStoreService = useMarketStore(
    (s) => s.removeOwnerStoreService,
  );
  const setOwnerStoreServicePublished = useMarketStore(
    (s) => s.setOwnerStoreServicePublished,
  );
  const setWorkspacePersistStoreId = useMarketStore(
    (s) => s.setWorkspacePersistStoreId,
  );

  useEffect(() => {
    if (!storeId) {
      setWorkspacePersistStoreId(null);
      return;
    }
    setWorkspacePersistStoreId(storeId);
    return () => setWorkspacePersistStoreId(null);
  }, [storeId, setWorkspacePersistStoreId]);

  const isOwner = useMemo(
    () => !!(store && me.id && store.ownerUserId === me.id),
    [store, me.id],
  );

  const [filtersBySection, setFiltersBySection] = useState<{
    vitrina: StoreSectionFilters;
    products: StoreSectionFilters;
    services: StoreSectionFilters;
  }>(() => ({
    vitrina: emptyStoreSectionFilters(),
    products: emptyStoreSectionFilters(),
    services: emptyStoreSectionFilters(),
  }));

  function patchSection(
    section: StoreFilterSection,
    patch: Partial<StoreSectionFilters>,
  ) {
    setFiltersBySection((s) => ({
      ...s,
      [section]: { ...s[section], ...patch },
    }));
  }
  const [detailStatus, setDetailStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [loadNonce, setLoadNonce] = useState(0);
  const [productCtx, setProductCtx] = useState<{ productId?: string } | null>(
    null,
  );
  const [serviceCtx, setServiceCtx] = useState<{ serviceId?: string } | null>(
    null,
  );
  const [catalogDeleteTarget, setCatalogDeleteTarget] = useState<
    | null
    | { kind: "product"; productId: string }
    | { kind: "service"; serviceId: string }
  >(null);
  const [catalogDeleteBusy, setCatalogDeleteBusy] = useState(false);
  const [catalogReloadBusy, setCatalogReloadBusy] = useState(false);
  const [catalogCategories, setCatalogCategories] = useState<string[]>();
  const [catalogCurrencies, setCatalogCurrencies] = useState<string[]>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cats = await fetchCatalogCategories();
        if (!cancelled && cats.length > 0) setCatalogCategories(cats);
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cur = await fetchCurrencies();
        if (!cancelled && cur.length > 0) setCatalogCurrencies(cur);
      } catch {
        /* keep default; los modales añaden CUP igualmente */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setProductCtx(null);
    setServiceCtx(null);
    setCatalogDeleteTarget(null);
    setFiltersBySection({
      vitrina: emptyStoreSectionFilters(),
      products: emptyStoreSectionFilters(),
      services: emptyStoreSectionFilters(),
    });
  }, [storeId]);

  const screen = useMemo(
    () => (storeId ? screenFromPathname(pathname, storeId) : "catalog"),
    [pathname, storeId],
  );

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setDetailStatus("loading");
    void (async () => {
      try {
        const data = await fetchStoreDetail(storeId, { userId: me.id });
        if (cancelled) return;
        setMarketHydrating(true);
        try {
          useMarketStore.setState((s) => ({
            stores: { ...s.stores, [storeId]: data.store },
            storeCatalogs: {
              ...s.storeCatalogs,
              [storeId]: mergeStoreCatalogWithLocalExtras(
                s.storeCatalogs[storeId],
                data.catalog,
              ),
            },
          }));
        } finally {
          setMarketHydrating(false);
        }
        setDetailStatus("ready");
      } catch {
        if (!cancelled) setDetailStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId, me.id, loadNonce]);

  const publishedProducts = useMemo(
    () => (catalog?.products ?? []).filter((p) => p.published),
    [catalog],
  );
  const publishedServices = useMemo(
    () => (catalog?.services ?? []).filter((s) => s.published !== false),
    [catalog],
  );

  const allCatalogProducts = useMemo(() => catalog?.products ?? [], [catalog]);
  const allCatalogServices = useMemo(() => catalog?.services ?? [], [catalog]);

  const publishedProductMax = useMemo(
    () => maxPriceFromProducts(publishedProducts),
    [publishedProducts],
  );
  const publishedServiceMax = useMemo(
    () => maxPriceFromServices(publishedServices),
    [publishedServices],
  );
  const publishedOfferMax = useMemo(
    () => Math.max(publishedProductMax, publishedServiceMax),
    [publishedProductMax, publishedServiceMax],
  );

  const ownerProductMax = useMemo(
    () => maxPriceFromProducts(allCatalogProducts),
    [allCatalogProducts],
  );
  const ownerServiceMax = useMemo(
    () => maxPriceFromServices(allCatalogServices),
    [allCatalogServices],
  );

  const vitrinaPriceMax = useMemo(
    () =>
      isOwner
        ? Math.max(
            maxPriceFromProducts(allCatalogProducts),
            maxPriceFromServices(allCatalogServices),
          )
        : publishedOfferMax,
    [
      isOwner,
      allCatalogProducts,
      allCatalogServices,
      publishedOfferMax,
    ],
  );

  const sliderMaxVitrina = useMemo(() => {
    const raw = vitrinaPriceMax;
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(raw, MAX_REASONABLE_PRICE);
  }, [vitrinaPriceMax]);

  const sliderMaxProducts = useMemo(() => {
    const raw = isOwner ? ownerProductMax : publishedProductMax;
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(raw, MAX_REASONABLE_PRICE);
  }, [isOwner, ownerProductMax, publishedProductMax]);

  const sliderMaxServices = useMemo(() => {
    const raw = isOwner ? ownerServiceMax : publishedServiceMax;
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    return Math.min(raw, MAX_REASONABLE_PRICE);
  }, [isOwner, ownerServiceMax, publishedServiceMax]);

  useEffect(() => {
    setFiltersBySection((s) => ({
      ...s,
      vitrina: clampStoreSectionPriceRange(s.vitrina, sliderMaxVitrina),
    }));
  }, [sliderMaxVitrina]);

  useEffect(() => {
    setFiltersBySection((s) => ({
      ...s,
      products: clampStoreSectionPriceRange(s.products, sliderMaxProducts),
    }));
  }, [sliderMaxProducts]);

  useEffect(() => {
    setFiltersBySection((s) => ({
      ...s,
      services: clampStoreSectionPriceRange(s.services, sliderMaxServices),
    }));
  }, [sliderMaxServices]);

  function sliderMaxFor(section: StoreFilterSection): number {
    if (section === "vitrina") return sliderMaxVitrina;
    if (section === "products") return sliderMaxProducts;
    return sliderMaxServices;
  }

  function handlePriceFloorChange(section: StoreFilterSection, v: number) {
    const max = Math.min(sliderMaxFor(section), MAX_REASONABLE_PRICE);
    const safe = Math.max(0, Math.min(Number.isFinite(v) ? v : 0, max));
    setFiltersBySection((s) => {
      const f = s[section];
      const cap = f.priceCeiling ?? max;
      const nextCeiling = safe > cap ? safe : f.priceCeiling;
      return {
        ...s,
        [section]: { ...f, priceFloor: safe, priceCeiling: nextCeiling },
      };
    });
  }

  function handlePriceCeilingChange(section: StoreFilterSection, v: number) {
    const max = Math.min(sliderMaxFor(section), MAX_REASONABLE_PRICE);
    const safe = Math.max(0, Math.min(Number.isFinite(v) ? v : max, max));
    setFiltersBySection((s) => {
      const f = s[section];
      const fl = f.priceFloor ?? 0;
      const nextFloor = safe < fl ? safe : f.priceFloor;
      return {
        ...s,
        [section]: { ...f, priceCeiling: safe, priceFloor: nextFloor },
      };
    });
  }

  const fv = filtersBySection.vitrina;
  const fp = filtersBySection.products;
  const fsv = filtersBySection.services;

  const vitrinaProductSource = isOwner ? allCatalogProducts : publishedProducts;
  const vitrinaServiceSource = isOwner ? allCatalogServices : publishedServices;

  const productCategoryOptions = useMemo(
    () => uniqueSorted(publishedProducts.map((p) => p.category)),
    [publishedProducts],
  );
  const serviceCategoryOptions = useMemo(
    () => uniqueSorted(publishedServices.map((s) => s.category)),
    [publishedServices],
  );

  const vitrinaPublishedProductsBase = useMemo(
    () => filterProductsBySectionText(vitrinaProductSource, fv),
    [
      vitrinaProductSource,
      fv.productNameQ,
      fv.productCategoryQ,
      fv.productConditionQ,
      fv.acceptedMonedaQ,
      fv.catalogPublishedFilter,
    ],
  );

  const vitrinaPublishedProducts = useMemo(
    () =>
      applyProductPriceRangeAndSort(vitrinaPublishedProductsBase, {
        sliderMax: sliderMaxVitrina,
        priceFloor: fv.priceFloor,
        priceCeiling: fv.priceCeiling,
        priceSort: fv.priceSort,
      }),
    [
      vitrinaPublishedProductsBase,
      sliderMaxVitrina,
      fv.priceFloor,
      fv.priceCeiling,
      fv.priceSort,
    ],
  );

  const vitrinaPublishedServicesBase = useMemo(
    () => filterServicesBySectionText(vitrinaServiceSource, fv),
    [
      vitrinaServiceSource,
      fv.serviceNameQ,
      fv.serviceCategoryQ,
      fv.acceptedMonedaQ,
      fv.catalogPublishedFilter,
    ],
  );

  const vitrinaPublishedServices = useMemo(
    () =>
      applyServicePriceRangeAndSort(vitrinaPublishedServicesBase, {
        sliderMax: sliderMaxVitrina,
        priceFloor: fv.priceFloor,
        priceCeiling: fv.priceCeiling,
        priceSort: fv.priceSort,
      }),
    [
      vitrinaPublishedServicesBase,
      sliderMaxVitrina,
      fv.priceFloor,
      fv.priceCeiling,
      fv.priceSort,
    ],
  );

  const productsTabPublishedProductsBase = useMemo(
    () => filterProductsBySectionText(publishedProducts, fp),
    [
      publishedProducts,
      fp.productNameQ,
      fp.productCategoryQ,
      fp.productConditionQ,
      fp.acceptedMonedaQ,
      fp.catalogPublishedFilter,
    ],
  );

  const productsTabPublishedProducts = useMemo(
    () =>
      applyProductPriceRangeAndSort(productsTabPublishedProductsBase, {
        sliderMax: sliderMaxProducts,
        priceFloor: fp.priceFloor,
        priceCeiling: fp.priceCeiling,
        priceSort: fp.priceSort,
      }),
    [
      productsTabPublishedProductsBase,
      sliderMaxProducts,
      fp.priceFloor,
      fp.priceCeiling,
      fp.priceSort,
    ],
  );

  const ownerProductCategoryOptions = useMemo(
    () => uniqueSorted(allCatalogProducts.map((p) => p.category)),
    [allCatalogProducts],
  );
  const ownerServiceCategoryOptions = useMemo(
    () => uniqueSorted(allCatalogServices.map((s) => s.category)),
    [allCatalogServices],
  );

  const catHints = catalogCategories ?? EMPTY_CATEGORY_HINTS;
  const currencyHints = catalogCurrencies ?? EMPTY_CURRENCY_HINTS;

  const productCategoryFilterOptions = useMemo(
    () =>
      uniqueSorted([
        ...catHints,
        ...(isOwner ? ownerProductCategoryOptions : productCategoryOptions),
      ]),
    [
      catHints,
      isOwner,
      ownerProductCategoryOptions,
      productCategoryOptions,
    ],
  );

  const serviceCategoryFilterOptions = useMemo(
    () =>
      uniqueSorted([
        ...catHints,
        ...(isOwner ? ownerServiceCategoryOptions : serviceCategoryOptions),
      ]),
    [
      catHints,
      isOwner,
      ownerServiceCategoryOptions,
      serviceCategoryOptions,
    ],
  );

  const vitrinaAcceptedMonedaOptions = useMemo(
    () =>
      collectCurrencyCodesForFilterOptions(
        currencyHints,
        vitrinaProductSource,
        vitrinaServiceSource,
      ),
    [currencyHints, vitrinaProductSource, vitrinaServiceSource],
  );

  const productsTabAcceptedMonedaOptions = useMemo(
    () =>
      collectCurrencyCodesForFilterOptions(
        currencyHints,
        isOwner ? allCatalogProducts : publishedProducts,
        [],
      ),
    [currencyHints, isOwner, allCatalogProducts, publishedProducts],
  );

  const servicesTabAcceptedMonedaOptions = useMemo(
    () =>
      collectCurrencyCodesForFilterOptions(
        currencyHints,
        [],
        isOwner ? allCatalogServices : publishedServices,
      ),
    [currencyHints, isOwner, allCatalogServices, publishedServices],
  );

  const productsTabOwnerProductsBase = useMemo(
    () => filterProductsBySectionText(allCatalogProducts, fp),
    [
      allCatalogProducts,
      fp.productNameQ,
      fp.productCategoryQ,
      fp.productConditionQ,
      fp.acceptedMonedaQ,
      fp.catalogPublishedFilter,
    ],
  );

  const productsTabOwnerProducts = useMemo(
    () =>
      applyProductPriceRangeAndSort(productsTabOwnerProductsBase, {
        sliderMax: sliderMaxProducts,
        priceFloor: fp.priceFloor,
        priceCeiling: fp.priceCeiling,
        priceSort: fp.priceSort,
      }),
    [
      productsTabOwnerProductsBase,
      sliderMaxProducts,
      fp.priceFloor,
      fp.priceCeiling,
      fp.priceSort,
    ],
  );

  const servicesTabPublishedServicesBase = useMemo(
    () => filterServicesBySectionText(publishedServices, fsv),
    [
      publishedServices,
      fsv.serviceNameQ,
      fsv.serviceCategoryQ,
      fsv.acceptedMonedaQ,
      fsv.catalogPublishedFilter,
    ],
  );

  const servicesTabPublishedServices = useMemo(
    () =>
      applyServicePriceRangeAndSort(servicesTabPublishedServicesBase, {
        sliderMax: sliderMaxServices,
        priceFloor: fsv.priceFloor,
        priceCeiling: fsv.priceCeiling,
        priceSort: fsv.priceSort,
      }),
    [
      servicesTabPublishedServicesBase,
      sliderMaxServices,
      fsv.priceFloor,
      fsv.priceCeiling,
      fsv.priceSort,
    ],
  );

  const servicesTabOwnerServicesBase = useMemo(
    () => filterServicesBySectionText(allCatalogServices, fsv),
    [
      allCatalogServices,
      fsv.serviceNameQ,
      fsv.serviceCategoryQ,
      fsv.acceptedMonedaQ,
      fsv.catalogPublishedFilter,
    ],
  );

  const servicesTabOwnerServices = useMemo(
    () =>
      applyServicePriceRangeAndSort(servicesTabOwnerServicesBase, {
        sliderMax: sliderMaxServices,
        priceFloor: fsv.priceFloor,
        priceCeiling: fsv.priceCeiling,
        priceSort: fsv.priceSort,
      }),
    [
      servicesTabOwnerServicesBase,
      sliderMaxServices,
      fsv.priceFloor,
      fsv.priceCeiling,
      fsv.priceSort,
    ],
  );

  const joinedLabel = catalog
    ? formatCatalogJoinedLabel(catalog.joinedAt)
    : null;

  if (!storeId) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Tienda no encontrada.</div>
      </div>
    );
  }

  const sid: string = storeId;

  if (detailStatus === "loading") {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad flex flex-col items-center justify-center gap-2 py-20 text-center">
          <div className="text-lg font-black tracking-[-0.02em]">
            Cargando tienda…
          </div>
          <div className="max-w-[360px] text-sm text-[var(--muted)]">
            Obteniendo catálogo y datos públicos según tu perfil.
          </div>
        </div>
      </div>
    );
  }

  if (detailStatus === "error") {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad flex flex-col items-center gap-4 py-16 text-center">
          <div className="font-bold">
            No se pudieron cargar los datos de la tienda.
          </div>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            onClick={() => setLoadNonce((n) => n + 1)}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // If we got here, we attempted loading and didn't error; if store is still missing, treat as not found.
  if (!store) {
    return (
      <div className="container vt-page">
        <div className="vt-card vt-card-pad">Tienda no encontrada.</div>
      </div>
    );
  }

  function goTo(next: StoreScreen) {
    nav(pathForStoreScreen(sid, next));
  }

  function goBack() {
    nav(-1);
  }

  const ownerId = store.ownerUserId as string;

  async function reloadStoreCatalogFromServer() {
    if (!storeId) return;
    setCatalogReloadBusy(true);
    try {
      const data = await fetchStoreDetail(sid, { userId: me.id });
      useMarketStore.setState((s) => ({
        ...s,
        stores: { ...s.stores, [sid]: data.store },
        storeCatalogs: {
          ...s.storeCatalogs,
          [sid]: mergeStoreCatalogWithLocalExtras(
            s.storeCatalogs[sid],
            data.catalog,
          ),
        },
      }));
      toast.success("Datos de la tienda actualizados");
    } catch {
      toast.error("No se pudieron actualizar los datos de la tienda");
    } finally {
      setCatalogReloadBusy(false);
    }
  }

  const productEditing =
    productCtx && productCtx.productId && catalog
      ? catalog.products.find((p) => p.id === productCtx.productId)
      : undefined;

  const serviceEditing =
    serviceCtx && serviceCtx.serviceId && catalog
      ? catalog.services.find((s) => s.id === serviceCtx.serviceId)
      : undefined;

  const headerTitle = storeScreenHeaderTitle(screen, store.name);

  const vitrinaFiltersProps = {
    vitrinaListMode: fv.vitrinaListMode,
    onVitrinaListMode: (v: VitrinaListMode) =>
      patchSection("vitrina", { vitrinaListMode: v }),
    productNameQ: fv.productNameQ,
    onProductNameQ: (q: string) => patchSection("vitrina", { productNameQ: q }),
    productCategory: fv.productCategoryQ,
    onProductCategory: (q: string) =>
      patchSection("vitrina", { productCategoryQ: q }),
    productCategories: productCategoryFilterOptions,
    productCondition: fv.productConditionQ,
    onProductCondition: (q: string) =>
      patchSection("vitrina", { productConditionQ: q }),
    serviceNameQ: fv.serviceNameQ,
    onServiceNameQ: (q: string) => patchSection("vitrina", { serviceNameQ: q }),
    serviceCategory: fv.serviceCategoryQ,
    onServiceCategory: (q: string) =>
      patchSection("vitrina", { serviceCategoryQ: q }),
    serviceCategories: serviceCategoryFilterOptions,
    priceSort: fv.priceSort,
    onPriceSort: (v: PriceSort) => patchSection("vitrina", { priceSort: v }),
    priceFloor: fv.priceFloor,
    priceCeiling: fv.priceCeiling,
    onPriceFloor: (v: number) => handlePriceFloorChange("vitrina", v),
    onPriceCeiling: (v: number) => handlePriceCeilingChange("vitrina", v),
    priceSliderMax: sliderMaxVitrina,
    acceptedMonedaQ: fv.acceptedMonedaQ,
    onAcceptedMonedaQ: (v: string[]) =>
      patchSection("vitrina", { acceptedMonedaQ: v }),
    acceptedMonedaOptions: vitrinaAcceptedMonedaOptions,
    showPublishedFilter: isOwner,
    catalogPublishedFilter: fv.catalogPublishedFilter,
    onCatalogPublishedFilter: (v: CatalogPublishedFilter) =>
      patchSection("vitrina", { catalogPublishedFilter: v }),
  };

  const showVitrinaProductList =
    fv.vitrinaListMode !== "services" && vitrinaPublishedProducts.length > 0;
  const showVitrinaServiceList =
    fv.vitrinaListMode !== "products" && vitrinaPublishedServices.length > 0;
  const vitrinaVisibleListsEmpty =
    (fv.vitrinaListMode !== "services"
      ? vitrinaPublishedProducts.length === 0
      : true) &&
    (fv.vitrinaListMode !== "products"
      ? vitrinaPublishedServices.length === 0
      : true);
  const vitrinaNoPublishedAtAll =
    fv.catalogPublishedFilter !== "draft" &&
    (fv.vitrinaListMode !== "services"
      ? publishedProducts.length === 0
      : true) &&
    (fv.vitrinaListMode !== "products" ? publishedServices.length === 0 : true);

  const catalogProductTile = (
    <StoreCatalogHubTile
      kind="products"
      publishedCount={publishedProducts.length}
      onClick={() => goTo("products")}
    />
  );

  const catalogServiceTile = (
    <StoreCatalogHubTile
      kind="services"
      publishedCount={publishedServices.length}
      onClick={() => goTo("services")}
    />
  );

  return (
    <div className="container vt-page relative pb-24">
      <div className="flex flex-col gap-3.5">
        {isOwner ? (
          <datalist id="store-cat-hints">
            {catHints.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        ) : null}
        <div className="vt-card vt-card-pad">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={backRowBtnClass}
              onClick={goBack}
              aria-label={screen === "catalog" ? "Volver" : "Atrás"}
              style={{
                minWidth: 40,
                minHeight: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="min-w-0 truncate text-lg font-black tracking-[-0.03em]">
              {headerTitle}
            </h1>
          </div>
        </div>

        {screen === "catalog" ? (
          <>
            <StoreIdentityBlock
              store={store}
              catalog={catalog}
              joinedLabel={joinedLabel}
            />
            <div className="vt-card vt-card-pad">
              <div className="vt-h2">Catálogo de la tienda</div>
              <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                Elegí Productos o Servicios: ahí están los filtros y el listado.
                {isOwner
                  ? " Como dueño también gestionás ítems (borradores y publicados)."
                  : " Solo ves lo publicado en vitrina."}
              </p>
              <div className="vt-divider my-3" />
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[560px]:flex-nowrap min-[560px]:overflow-visible">
                {catalogProductTile}
                {catalogServiceTile}
              </div>
            </div>
            <button
              type="button"
              className="fixed right-4 z-[65] inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-black shadow-[0_12px_40px_rgba(2,6,23,0.2)] transition hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] min-[480px]:right-8 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]"
              onClick={() => goTo("vitrina")}
            >
              <LayoutGrid
                size={20}
                className="text-[var(--primary)]"
                aria-hidden
              />
              Ver vitrina
            </button>
          </>
        ) : null}

        {screen === "vitrina" ? (
          <>
            <StoreIdentityBlock
              store={store}
              catalog={catalog}
              joinedLabel={joinedLabel}
            />
            <div className="vt-card vt-card-pad flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
                    Vitrina pública
                  </div>
                  <p className="vt-muted mt-1 max-w-[720px] text-[13px] leading-snug">
                    Fichas completas de productos y servicios publicados en
                    vitrina. Usá los filtros para acotar.
                  </p>
                </div>
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost vt-btn-sm inline-flex shrink-0 items-center gap-1.5"
                  disabled={catalogReloadBusy}
                  title="Recargar datos de la tienda desde el servidor"
                  aria-label="Recargar vitrina"
                  onClick={() => void reloadStoreCatalogFromServer()}
                >
                  <RefreshCw
                    size={14}
                    aria-hidden
                    className={
                      catalogReloadBusy ? "animate-spin" : ""
                    }
                  />
                  Recargar
                </button>
              </div>
              <VitrinaFiltersCard {...vitrinaFiltersProps} />

              {showVitrinaProductList ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                      Productos
                    </span>
                    <button
                      type="button"
                      className="vt-btn vt-btn-ghost vt-btn-sm"
                      onClick={() => goTo("products")}
                    >
                      Ver todos
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {vitrinaPublishedProducts.map((p) => (
                      <ProductDetailCard key={p.id} p={p} />
                    ))}
                  </div>
                </div>
              ) : null}

              {showVitrinaServiceList ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                      Servicios
                    </span>
                    <button
                      type="button"
                      className="vt-btn vt-btn-ghost vt-btn-sm"
                      onClick={() => goTo("services")}
                    >
                      Ver todos
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {vitrinaPublishedServices.map((s) => (
                      <ServiceDetailCard key={s.id} s={s} />
                    ))}
                  </div>
                </div>
              ) : null}

              {vitrinaVisibleListsEmpty ? (
                <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                  {vitrinaNoPublishedAtAll
                    ? "Esta tienda aún no tiene contenido publicado en vitrina."
                    : "Ningún resultado con los filtros actuales. Probá otro nombre, categoría o moneda."}
                </p>
              ) : null}
            </div>
            <ScrollToTopFab />
          </>
        ) : null}

        {screen === "products" ? (
          <>
            <ProductFiltersCard
              productNameQ={fp.productNameQ}
              onProductNameQ={(q) =>
                patchSection("products", { productNameQ: q })
              }
              productCategory={fp.productCategoryQ}
              onProductCategory={(q) =>
                patchSection("products", { productCategoryQ: q })
              }
              productCategories={productCategoryFilterOptions}
              productCondition={fp.productConditionQ}
              onProductCondition={(q) =>
                patchSection("products", { productConditionQ: q })
              }
              priceSort={fp.priceSort}
              onPriceSort={(v) => patchSection("products", { priceSort: v })}
              priceFloor={fp.priceFloor}
              priceCeiling={fp.priceCeiling}
              onPriceFloor={(v) => handlePriceFloorChange("products", v)}
              onPriceCeiling={(v) => handlePriceCeilingChange("products", v)}
              priceSliderMax={sliderMaxProducts}
              acceptedMonedaQ={fp.acceptedMonedaQ}
              onAcceptedMonedaQ={(v: string[]) =>
                patchSection("products", { acceptedMonedaQ: v })
              }
              acceptedMonedaOptions={productsTabAcceptedMonedaOptions}
              showPublishedFilter={isOwner}
              catalogPublishedFilter={fp.catalogPublishedFilter}
              onCatalogPublishedFilter={(v: CatalogPublishedFilter) =>
                patchSection("products", { catalogPublishedFilter: v })
              }
            />
            <div className="vt-card vt-card-pad">
              {isOwner ? (
                <>
                  <div className="vt-h2">Gestionar productos</div>
                  <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                    Borradores y publicados. Publicá para que aparezcan en la
                    vitrina.
                  </p>
                  <div className="vt-divider my-3" />
                  <OwnerCatalogProductList
                    showSectionLabel={false}
                    className="mt-0 border-0 pt-0"
                    cat={catalog}
                    productsOverride={productsTabOwnerProducts}
                    catalogReloadBusy={catalogReloadBusy}
                    onReload={() => void reloadStoreCatalogFromServer()}
                    onAdd={() => setProductCtx({})}
                    onEdit={(productId) => setProductCtx({ productId })}
                    onRemove={(productId) =>
                      setCatalogDeleteTarget({ kind: "product", productId })
                    }
                    onTogglePublished={(productId, published) => {
                      void (async () => {
                        if (
                          !setOwnerStoreProductPublished(
                            sid,
                            ownerId,
                            productId,
                            published,
                          )
                        ) {
                          toast.error("No se pudo actualizar");
                          return;
                        }
                        const p = useMarketStore
                          .getState()
                          .storeCatalogs[sid]?.products.find(
                            (x) => x.id === productId,
                          );
                        if (!p) return;
                        try {
                          await putStoreProduct(sid, p);
                          toast.success(
                            published
                              ? "Producto publicado en la tienda"
                              : "Producto oculto de la tienda",
                          );
                        } catch {
                          toast.error(
                            "No se pudo guardar en el servidor. Reintentá.",
                          );
                        }
                      })();
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="vt-h2">Todos los productos</div>
                  <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                    Solo se listan productos publicados en la vitrina (respetan
                    el filtro de arriba).
                  </p>
                  <div className="vt-divider my-3" />
                  {productsTabPublishedProducts.length ? (
                    <div className="flex flex-col gap-3">
                      {productsTabPublishedProducts.map((p) => (
                        <ProductDetailCard key={p.id} p={p} />
                      ))}
                    </div>
                  ) : publishedProducts.length ? (
                    <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                      Ningún producto coincide con el filtro. Ajustá nombre,
                      categoría o moneda.
                    </p>
                  ) : (
                    <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                      No hay productos publicados en la vitrina.
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        ) : null}

        {screen === "services" ? (
          <>
            <ServiceFiltersCard
              serviceNameQ={fsv.serviceNameQ}
              onServiceNameQ={(q) =>
                patchSection("services", { serviceNameQ: q })
              }
              serviceCategory={fsv.serviceCategoryQ}
              onServiceCategory={(q) =>
                patchSection("services", { serviceCategoryQ: q })
              }
              serviceCategories={serviceCategoryFilterOptions}
              priceSort={fsv.priceSort}
              onPriceSort={(v) => patchSection("services", { priceSort: v })}
              priceFloor={fsv.priceFloor}
              priceCeiling={fsv.priceCeiling}
              onPriceFloor={(v) => handlePriceFloorChange("services", v)}
              onPriceCeiling={(v) => handlePriceCeilingChange("services", v)}
              priceSliderMax={sliderMaxServices}
              acceptedMonedaQ={fsv.acceptedMonedaQ}
              onAcceptedMonedaQ={(v: string[]) =>
                patchSection("services", { acceptedMonedaQ: v })
              }
              acceptedMonedaOptions={servicesTabAcceptedMonedaOptions}
              showPublishedFilter={isOwner}
              catalogPublishedFilter={fsv.catalogPublishedFilter}
              onCatalogPublishedFilter={(v: CatalogPublishedFilter) =>
                patchSection("services", { catalogPublishedFilter: v })
              }
            />
            <div className="vt-card vt-card-pad">
              {isOwner ? (
                <>
                  <div className="vt-h2">Gestionar servicios</div>
                  <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                    Borradores y publicados. Publicá para que aparezcan en la
                    vitrina.
                  </p>
                  <div className="vt-divider my-3" />
                  <OwnerCatalogServiceList
                    showSectionLabel={false}
                    className="mt-0 border-0 pt-0"
                    cat={catalog}
                    servicesOverride={servicesTabOwnerServices}
                    catalogReloadBusy={catalogReloadBusy}
                    onReload={() => void reloadStoreCatalogFromServer()}
                    onAdd={() => setServiceCtx({})}
                    onEdit={(serviceId) => setServiceCtx({ serviceId })}
                    onRemove={(serviceId) =>
                      setCatalogDeleteTarget({ kind: "service", serviceId })
                    }
                    onTogglePublished={(serviceId, published) => {
                      void (async () => {
                        if (
                          !setOwnerStoreServicePublished(
                            sid,
                            ownerId,
                            serviceId,
                            published,
                          )
                        ) {
                          toast.error("No se pudo actualizar");
                          return;
                        }
                        const svc = useMarketStore
                          .getState()
                          .storeCatalogs[sid]?.services.find(
                            (x) => x.id === serviceId,
                          );
                        if (!svc) return;
                        try {
                          await putStoreService(sid, svc);
                          toast.success(
                            published
                              ? "Servicio publicado en la tienda"
                              : "Servicio oculto de la tienda",
                          );
                        } catch {
                          toast.error(
                            "No se pudo guardar en el servidor. Reintentá.",
                          );
                        }
                      })();
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="vt-h2">Todos los servicios</div>
                  <p className="vt-muted mt-1.5 text-[13px] leading-snug">
                    Solo se listan servicios publicados en la vitrina (respetan
                    el filtro de arriba).
                  </p>
                  <div className="vt-divider my-3" />
                  {servicesTabPublishedServices.length ? (
                    <div className="flex flex-col gap-3">
                      {servicesTabPublishedServices.map((s) => (
                        <ServiceDetailCard key={s.id} s={s} />
                      ))}
                    </div>
                  ) : publishedServices.length ? (
                    <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                      Ningún servicio coincide con el filtro. Ajustá nombre,
                      categoría o moneda.
                    </p>
                  ) : (
                    <p className="vt-muted rounded-xl border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-3 text-[13px] leading-snug">
                      No hay servicios publicados en la vitrina.
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        ) : null}

        <ConfirmDeleteModal
          open={catalogDeleteTarget !== null}
          title={
            catalogDeleteTarget?.kind === "product"
              ? "Eliminar producto"
              : catalogDeleteTarget?.kind === "service"
                ? "Eliminar servicio"
                : "Eliminar"
          }
          message={
            catalogDeleteTarget?.kind === "product"
              ? "¿Quitar este producto del catálogo de la tienda?"
              : catalogDeleteTarget?.kind === "service"
                ? "¿Quitar este servicio del catálogo de la tienda?"
                : "¿Confirmás eliminar?"
          }
          confirmBusy={catalogDeleteBusy}
          onCancel={() => {
            if (catalogDeleteBusy) return;
            setCatalogDeleteTarget(null);
          }}
          onConfirm={() => {
            if (!catalogDeleteTarget || catalogDeleteBusy) return;
            const target = catalogDeleteTarget;
            setCatalogDeleteBusy(true);
            void (async () => {
              try {
                if (target.kind === "product") {
                  try {
                    await deleteStoreProductApi(sid, target.productId);
                  } catch {
                    toast.error(
                      "No se pudo eliminar en el servidor. Reintentá.",
                    );
                    return;
                  }
                  if (
                    !removeOwnerStoreProduct(sid, ownerId, target.productId)
                  ) {
                    toast.error("No se pudo actualizar el estado local");
                    return;
                  }
                  toast.success("Producto quitado");
                  setCatalogDeleteTarget(null);
                } else if (target.kind === "service") {
                  try {
                    await deleteStoreServiceApi(sid, target.serviceId);
                  } catch {
                    toast.error(
                      "No se pudo eliminar en el servidor. Reintentá.",
                    );
                    return;
                  }
                  if (
                    !removeOwnerStoreService(sid, ownerId, target.serviceId)
                  ) {
                    toast.error("No se pudo actualizar el estado local");
                    return;
                  }
                  toast.success("Servicio quitado");
                  setCatalogDeleteTarget(null);
                }
              } finally {
                setCatalogDeleteBusy(false);
              }
            })();
          }}
        />

        {productCtx !== null ? (
          <ProductEditorModal
            key={`${sid}-product-${productCtx.productId ?? "new"}`}
            open
            title={productEditing ? "Editar producto" : "Añadir producto"}
            categoryOptions={catHints}
            currencyOptions={currencyHints}
            initial={
              productEditing
                ? {
                    category: productEditing.category,
                    name: productEditing.name,
                    model: productEditing.model,
                    shortDescription: productEditing.shortDescription,
                    mainBenefit: productEditing.mainBenefit,
                    technicalSpecs: productEditing.technicalSpecs,
                    condition: productEditing.condition,
                    price: productEditing.price,
                    monedaPrecio: productEditing.monedaPrecio ?? "",
                    monedas: catalogMonedasList(productEditing),
                    taxesShippingInstall: productEditing.taxesShippingInstall,
                    availability: productEditing.availability,
                    warrantyReturn: productEditing.warrantyReturn,
                    contentIncluded: productEditing.contentIncluded,
                    usageConditions: productEditing.usageConditions,
                    photoUrls: productEditing.photoUrls,
                    published: productEditing.published,
                    customFields: productEditing.customFields.length
                      ? productEditing.customFields
                      : [],
                  }
                : emptyStoreProductInput()
            }
            onClose={() => setProductCtx(null)}
            onSave={(input) => {
              void (async () => {
                try {
                  if (productCtx.productId) {
                    const ok = updateOwnerStoreProduct(
                      sid,
                      ownerId,
                      productCtx.productId,
                      input,
                    );
                    if (!ok) {
                      toast.error("No se pudo actualizar el producto.");
                      return;
                    }
                    const p = useMarketStore
                      .getState()
                      .storeCatalogs[sid]?.products.find(
                        (x) => x.id === productCtx.productId,
                      );
                    if (p) await putStoreProduct(sid, p);
                    toast.success("Producto actualizado");
                  } else {
                    const pid = addOwnerStoreProduct(sid, ownerId, input);
                    if (pid) {
                      const p = useMarketStore
                        .getState()
                        .storeCatalogs[sid]?.products.find(
                          (x) => x.id === pid,
                        );
                      if (p) await putStoreProduct(sid, p);
                      toast.success("Producto añadido");
                      patchSection("products", {
                        productNameQ: "",
                        productCategoryQ: "",
                        productConditionQ: "",
                      });
                    } else {
                      toast.error(
                        "No se pudo añadir el producto. Revisá que seas el dueño o recargá la tienda.",
                      );
                    }
                  }
                } catch {
                  toast.error(
                    "No se pudo guardar el producto en el servidor. Reintentá.",
                  );
                }
              })();
            }}
          />
        ) : null}

        {serviceCtx !== null ? (
          <ServiceEditorModal
            key={`${sid}-service-${serviceCtx.serviceId ?? "new"}`}
            open
            title={serviceEditing ? "Editar servicio" : "Añadir servicio"}
            categoryOptions={catHints}
            currencyOptions={currencyHints}
            initial={
              serviceEditing
                ? {
                    published: serviceEditing.published !== false,
                    category: serviceEditing.category,
                    tipoServicio: serviceEditing.tipoServicio,
                    monedas: catalogMonedasList(serviceEditing),
                    descripcion: serviceEditing.descripcion,
                    riesgos: { ...serviceEditing.riesgos },
                    incluye: serviceEditing.incluye,
                    noIncluye: serviceEditing.noIncluye,
                    dependencias: { ...serviceEditing.dependencias },
                    entregables: serviceEditing.entregables,
                    garantias: { ...serviceEditing.garantias },
                    propIntelectual: serviceEditing.propIntelectual,
                    photoUrls: [...(serviceEditing.photoUrls ?? [])],
                    customFields: serviceEditing.customFields.length
                      ? serviceEditing.customFields
                      : [],
                  }
                : emptyStoreServiceInput()
            }
            onClose={() => setServiceCtx(null)}
            onSave={(input) => {
              void (async () => {
                try {
                  if (serviceCtx.serviceId) {
                    const ok = updateOwnerStoreService(
                      sid,
                      ownerId,
                      serviceCtx.serviceId,
                      input,
                    );
                    if (!ok) {
                      toast.error("No se pudo actualizar el servicio.");
                      return;
                    }
                    const svc = useMarketStore
                      .getState()
                      .storeCatalogs[sid]?.services.find(
                        (x) => x.id === serviceCtx.serviceId,
                      );
                    if (svc) await putStoreService(sid, svc);
                    toast.success("Servicio actualizado");
                  } else {
                    const newId = addOwnerStoreService(sid, ownerId, input);
                    if (newId) {
                      const svc = useMarketStore
                        .getState()
                        .storeCatalogs[sid]?.services.find(
                          (x) => x.id === newId,
                        );
                      if (svc) await putStoreService(sid, svc);
                      toast.success("Servicio añadido");
                      patchSection("services", {
                        serviceNameQ: "",
                        serviceCategoryQ: "",
                      });
                    } else {
                      toast.error(
                        "No se pudo añadir el servicio. Revisá que seas el dueño o recargá la tienda.",
                      );
                    }
                  }
                } catch {
                  toast.error(
                    "No se pudo guardar el servicio en el servidor. Reintentá.",
                  );
                }
              })();
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
