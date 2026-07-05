import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ExternalLink, LogOut, Menu, Store, X } from "lucide-react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import {
  reloadStoreDetailToStore,
  useStorePageDetail,
} from "@features/market/hooks/useStorePageDetail";
import { useStoreIdFromName } from "@features/market/hooks/useStoreByName";
import { storeHref, storePanelHref } from "@features/market/logic/store/storePath";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { StoreEntryLoadingScreen } from "@features/storefront/components/StoreEntryLoadingScreen";
import { useStoreLogoLoaded } from "@features/storefront/logic/useStoreLogoLoaded";
import { logoutWebApp } from "@features/auth/logic/logoutWebApp";
import { isStaffSession } from "@features/auth/logic/roles";
import {
  DEFAULT_STORE_ADMIN_SECTION,
  STORE_ADMIN_NAV,
  isStoreAdminSection,
  sectionLabel,
  type StoreAdminSectionId,
} from "../logic/storeAdminNav";
import type {
  StoreCategoryDto,
  StoreSupplierDto,
} from "@features/market/Dtos/storeCatalogTypes";
import {
  fetchStoreCategories,
  fetchStoreSuppliers,
} from "@features/market/api/storeInventoryApi";
import { useOwnerStoreCatalog } from "../hooks/useOwnerStoreCatalog";
import { InventorySection } from "../sections/InventorySection";
import { ServicesSection } from "../sections/ServicesSection";
import { OrdersSection } from "../sections/OrdersSection";
import { StatisticsSection } from "../sections/StatisticsSection";
import { FinanceSection } from "../sections/FinanceSection";
import { UsersSection } from "../sections/UsersSection";
import { AffiliatesSection } from "../sections/AffiliatesSection";
import { WarehousesSection } from "../sections/WarehousesSection";

export function OwnerStoreDashboard() {
  const { storeName, storeId: storeIdParam, section } = useParams();
  const nav = useNavigate();
  const me = useAppStore((s) => s.me);
  const { storeId: resolvedByName, resolving, notFound, fetchedStore } = useStoreIdFromName(
    storeName,
    me.id,
  );
  const storeId = storeIdParam ?? resolvedByName;
  const store = useMarketStore((s) => (storeId ? s.stores[storeId] : undefined));
  const loadingStore = store ?? fetchedStore;
  const logoLoaded = useStoreLogoLoaded(
    loadingStore?.name ?? storeName,
    loadingStore?.avatarUrl,
  );
  const [loadNonce] = useState(0);
  const { detailStatus, isFetching } = useStorePageDetail(
    storeId,
    me.id,
    loadNonce,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [storeCategories, setStoreCategories] = useState<StoreCategoryDto[]>(
    [],
  );
  const [storeSuppliers, setStoreSuppliers] = useState<StoreSupplierDto[]>([]);
  const [inventoryMetaLoading, setInventoryMetaLoading] = useState(false);

  const activeSection: StoreAdminSectionId = isStoreAdminSection(section)
    ? section
    : DEFAULT_STORE_ADMIN_SECTION;

  const ownerId = (store?.ownerUserId ?? "") as string;
  const isOwner = Boolean(store && me.id && store.ownerUserId === me.id);
  const isStaffOfStore = isStaffSession(me) && me.staffStoreId === storeId;
  const authorized = isOwner || isStaffOfStore;

  // Se llama siempre (aunque no autorizado) para respetar el orden de hooks.
  const reloadInventoryMeta = useCallback(async () => {
    if (!storeId) return;
    const [cats, sups] = await Promise.all([
      fetchStoreCategories(storeId),
      fetchStoreSuppliers(storeId),
    ]);
    setStoreCategories(cats);
    setStoreSuppliers(sups);
  }, [storeId]);

  const ownerCatalog = useOwnerStoreCatalog(storeId ?? "", ownerId, {
    categories: storeCategories,
    suppliers: storeSuppliers,
    onRefreshCategories: reloadInventoryMeta,
  });

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    setInventoryMetaLoading(true);
    void reloadInventoryMeta().finally(() => {
      if (!cancelled) setInventoryMetaLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [storeId, reloadInventoryMeta]);

  const inventoryLoading =
    detailStatus === "loading" || inventoryMetaLoading || isFetching;

  const displayName = useMemo(
    () => (isOwner ? "Dueño" : "Personal"),
    [isOwner],
  );

  if (!storeName && !storeIdParam) return <Navigate to="/home" replace />;

  if ((resolving || detailStatus === "loading" || !logoLoaded) && !store && !notFound) {
    return (
      <StoreEntryLoadingScreen
        storeName={loadingStore?.name ?? storeName}
        avatarUrl={loadingStore?.avatarUrl}
        label="Cargando panel"
      />
    );
  }

  // Cargado y sin autorización: mostrar el storefront (cliente).
  if (store && !authorized) {
    return <Navigate to={storeHref(store)} replace />;
  }

  if (!store) {
    return (
      <div className="store-admin-surface grid min-h-[60vh] place-items-center bg-[#eef0f4]">
        <p className="text-sm text-gray-500">Tienda no encontrada.</p>
      </div>
    );
  }

  const sid: string = store.id;
  const storeForSections = store;
  // Conserva el esquema de URL por el que se entró (nombre para el dueño; id legado para el staff)
  // para no rebotar la navegación interna.
  const usingName = Boolean(storeName);
  const panelLinkTo = (sectionId: string) =>
    usingName
      ? storePanelHref(store, sectionId)
      : `/store/${sid}/panel/${sectionId}`;
  const storefrontLinkTo = usingName ? storeHref(store) : `/store/${sid}`;

  function renderSection() {
    switch (activeSection) {
      case "productos":
        return (
          <InventorySection
            storeId={sid}
            products={ownerCatalog.products}
            categories={storeCategories}
            suppliers={storeSuppliers}
            isLoading={inventoryLoading}
            onRefresh={async () => {
              await reloadStoreDetailToStore(sid, me.id);
            }}
            onAdd={ownerCatalog.openAddProduct}
            onEdit={ownerCatalog.openEditProduct}
            onRemove={ownerCatalog.requestDeleteProduct}
          />
        );
      case "servicios":
        return (
          <ServicesSection
            services={ownerCatalog.services}
            onAdd={ownerCatalog.openAddService}
            onEdit={ownerCatalog.openEditService}
            onRemove={ownerCatalog.requestDeleteService}
            onTogglePublish={ownerCatalog.togglePublishService}
          />
        );
      case "pedidos":
        return <OrdersSection storeId={sid} />;
      case "estadisticas":
        return <StatisticsSection storeId={sid} />;
      case "finanzas":
        return <FinanceSection storeId={sid} />;
      case "usuarios":
        return isOwner ? (
          <UsersSection storeId={sid} />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-14 text-center text-sm text-gray-500">
            Solo el dueño de la tienda puede gestionar el personal.
          </div>
        );
      case "afiliados":
        return <AffiliatesSection storeId={sid} />;
      case "almacenes":
        return <WarehousesSection storeId={sid} store={storeForSections} />;
      default:
        return null;
    }
  }

  const navItems = STORE_ADMIN_NAV.filter(
    (item) => item.id !== "usuarios" || isOwner,
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 pb-6 pt-1">
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-emerald-100 bg-white p-1 text-emerald-700">
          {store.avatarUrl ? (
            <ProtectedMediaImg
              src={store.avatarUrl}
              alt={`Logo de ${store.name}`}
              wrapperClassName="h-full w-full"
              className="h-full w-full object-contain"
            />
          ) : (
            <Store size={20} aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-black leading-tight text-emerald-800">
            {store.name}
          </p>
          <p className="text-xs text-gray-500">Panel de gestión</p>
        </div>
      </div>

      <nav
        className="flex flex-col gap-1 px-2 md:flex-1 md:overflow-y-auto"
        aria-label="Secciones del panel"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={panelLinkTo(item.id)}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  isActive || item.id === activeSection
                    ? "bg-white font-semibold text-emerald-800 shadow-sm ring-1 ring-black/5"
                    : "text-gray-600 hover:bg-white/70"
                }`
              }
              end={false}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 text-gray-500 ring-1 ring-black/5">
                <Icon size={16} aria-hidden />
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-emerald-100 px-3 py-4">
        <Link
          to={storefrontLinkTo}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-white/70"
        >
          <ExternalLink size={16} className="text-gray-400" aria-hidden />
          Ver storefront
        </Link>
        <button
          type="button"
          onClick={() => void logoutWebApp().then(() => nav("/home", { replace: true }))}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-white/70"
        >
          <LogOut size={16} className="text-gray-400" aria-hidden />
          Cerrar sesión
        </button>
        <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-700 text-xs font-bold text-white">
            {displayName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900">
              {me.name || displayName}
            </p>
            <p className="truncate text-xs text-gray-500">{displayName}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="store-admin-surface -mt-4 flex min-h-[calc(100vh-64px)] w-full bg-[#eef0f4] text-gray-900">
      {/* Sidebar escritorio */}
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-emerald-100 bg-[#e9f2ee] py-6 md:flex">
        {sidebar}
      </aside>

      {/* Off-canvas móvil */}
      <button
        type="button"
        aria-hidden={!menuOpen}
        tabIndex={menuOpen ? 0 : -1}
        className={`fixed inset-0 z-[48] bg-black/40 transition-opacity md:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
        aria-label="Cerrar menú"
      />
      <aside
        className={`fixed bottom-0 left-0 top-0 z-[50] flex w-[min(84vw,300px)] flex-col border-r border-emerald-100 bg-[#e9f2ee] py-5 shadow-xl transition-transform md:hidden ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Menú
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="rounded-lg p-2 text-gray-500 hover:bg-white/70"
            aria-label="Cerrar menú"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        {sidebar}
      </aside>

      {/* Contenido */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-[40] flex items-center gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={20} aria-hidden />
          </button>
          <h1 className="text-lg font-black tracking-tight text-emerald-800">
            {sectionLabel(activeSection)}
          </h1>
          <Link
            to={storefrontLinkTo}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <ExternalLink size={15} aria-hidden />
            <span className="hidden sm:inline">Storefront</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 md:px-8">
          {renderSection()}
        </main>
      </div>

      {ownerCatalog.modals}
    </div>
  );
}
