import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ChevronRight, X } from "lucide-react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStoreDetail } from "@features/market/hooks/useStoreDetail";
import {
  storeCategoryHref,
  storeProductHref,
} from "@features/market/logic/store/storePath";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import type { StoreProduct } from "@features/market/Dtos/storeCatalogTypes";
import { useStoreCategories } from "../context/StoreCategoriesContext";
import {
  useStorefrontAmbient,
  storefrontAmbientPortalProps,
} from "../context/StorefrontAmbientContext";
import { cn } from "@shared/lib/cn";
import { assignUniqueCategorySlugs } from "../logic/categoryTree/buildGuestCategoryMetas";
import type { CategoryMeta } from "../logic/categoryTree/categoryMeta";
import {
  leafDescendantsUnderRoot,
  pickLeafCategoryForProduct,
} from "../logic/categoryTree/guestCategoryTree";

const MAX_PRODUCTS_PER_SUBCATEGORY_IN_PANEL = 32;
const PANEL_TRANSITION_MS = 300;
const MD_UP_MEDIA = "(min-width: 768px)";

function useMdUp() {
  const [mdUp, setMdUp] = useState(
    () =>
      typeof globalThis !== "undefined" &&
      globalThis.matchMedia(MD_UP_MEDIA).matches,
  );
  useEffect(() => {
    const mq = globalThis.matchMedia(MD_UP_MEDIA);
    const onChange = () => setMdUp(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return mdUp;
}

function resolveProductLeafId(
  product: StoreProduct,
  leafIds: ReadonlySet<string>,
  categories: ReturnType<typeof useStoreCategories>["categories"],
): string | null {
  if (product.categoryIds?.length) {
    const picked = pickLeafCategoryForProduct(
      product.categoryIds,
      leafIds,
      categories,
    );
    if (picked) return picked;
  }
  const catName = product.category.trim().toLowerCase();
  if (!catName) return null;
  for (const leafId of leafIds) {
    const leaf = categories.find((c) => c.id === leafId);
    if (leaf && leaf.name.trim().toLowerCase() === catName) return leafId;
  }
  return null;
}

type OffcanvasDetailBodyProps = {
  store: StoreBadge;
  selected: CategoryMeta | null;
  listingLeaves: ReturnType<typeof useStoreCategories>["categories"];
  productsByLeaf: Map<string, StoreProduct[]>;
  productsLoading: boolean;
  idToSlug: Map<string, string>;
  onNavigate: () => void;
  onProductSelect?: (product: StoreProduct) => void;
};

function OffcanvasDetailBody({
  store,
  selected,
  listingLeaves,
  productsByLeaf,
  productsLoading,
  idToSlug,
  onNavigate,
  onProductSelect,
}: OffcanvasDetailBodyProps) {
  if (!selected) {
    return <p className="text-sm text-slate-500">Selecciona una categoría.</p>;
  }
  if (listingLeaves.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          No hay subcategorías para mostrar. Podés ver todos los productos de
          esta categoría.
        </p>
        <Link
          to={storeCategoryHref(store, selected.slug)}
          onClick={onNavigate}
          className="vt-storefront-accent-text inline-flex text-sm font-semibold italic underline-offset-4 hover:underline"
        >
          Explorar categoría
        </Link>
      </div>
    );
  }
  if (productsLoading) {
    return <p className="text-sm text-slate-500">Cargando productos…</p>;
  }
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-x-8 gap-y-8 md:gap-y-10">
        {listingLeaves.map((leaf) => {
          const slug = idToSlug.get(leaf.id);
          if (!slug) return null;
          const allForLeaf = productsByLeaf.get(leaf.id) ?? [];
          const shownProducts = allForLeaf.slice(
            0,
            MAX_PRODUCTS_PER_SUBCATEGORY_IN_PANEL,
          );
          const productListTruncated =
            allForLeaf.length > MAX_PRODUCTS_PER_SUBCATEGORY_IN_PANEL;

          return (
            <section
              key={leaf.id}
              className="min-w-0"
              aria-labelledby={`offcanvas-leaf-${leaf.id}`}
            >
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--border)] pb-2">
                <h3
                  id={`offcanvas-leaf-${leaf.id}`}
                  className="vt-storefront-accent-text text-[11px] font-bold uppercase tracking-[0.12em]"
                >
                  <Link
                    to={storeCategoryHref(store, slug)}
                    onClick={onNavigate}
                    className="vt-storefront-accent-text transition hover:opacity-90"
                  >
                    {leaf.name}
                  </Link>
                </h3>
                <Link
                  to={storeCategoryHref(store, slug)}
                  onClick={onNavigate}
                  className="text-xs font-semibold text-slate-500 underline-offset-2 transition hover:underline vt-storefront-accent-text"
                >
                  Ver todos
                </Link>
              </div>

              {allForLeaf.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No hay productos en esta subcategoría por ahora.
                </p>
              ) : (
                <div className="mt-3 md:mt-4">
                  <ul className="flex flex-col gap-2.5 pt-1">
                    {shownProducts.map((p) => (
                      <li key={p.id}>
                        {onProductSelect ? (
                          <button
                            type="button"
                            onClick={() => {
                              onProductSelect(p);
                              onNavigate();
                            }}
                            className="block w-full text-left text-sm font-normal leading-snug text-slate-600 transition vt-storefront-accent-text hover:opacity-90"
                          >
                            {p.name}
                          </button>
                        ) : (
                          <Link
                            to={storeProductHref(store, p.id)}
                            onClick={onNavigate}
                            className="block text-sm font-normal leading-snug text-slate-600 transition vt-storefront-accent-text hover:opacity-90"
                          >
                            {p.name}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                  {productListTruncated ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Mostrando los primeros{" "}
                      {MAX_PRODUCTS_PER_SUBCATEGORY_IN_PANEL} productos.{" "}
                      <Link
                        to={storeCategoryHref(store, slug)}
                        onClick={onNavigate}
                        className="vt-storefront-accent-text font-semibold hover:underline"
                      >
                        Ver todos en esta subcategoría
                      </Link>
                    </p>
                  ) : null}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {listingLeaves.length > 0 && !productsLoading ? (
        <div className="mt-8 flex justify-start border-t border-[var(--border)] pt-6 md:mt-10 md:pt-8">
          <Link
            to={storeCategoryHref(store, selected.slug)}
            onClick={onNavigate}
            className="vt-storefront-accent-btn inline-flex w-fit max-w-full shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition"
          >
            Ver todos en {selected.label}
          </Link>
        </div>
      ) : null}
    </>
  );
}

/**
 * Menú de categorías jerárquico de la tienda: desktop en dos columnas (raíces +
 * subcategorías con productos); móvil con hoja inferior al elegir una raíz.
 */
export function StoreCategoriesOffcanvas({
  open,
  onClose,
  store,
  onProductSelect,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  store: StoreBadge;
  onProductSelect?: (product: StoreProduct) => void;
}>) {
  const mdUp = useMdUp();
  const titleId = useId();
  const detailTitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const sheetCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ambient = useStorefrontAmbient();
  const portalAmbient = storefrontAmbientPortalProps(ambient);

  const { categoryMetas, categories, loading: categoriesLoading } =
    useStoreCategories();
  const me = useAppStore((s) => s.me);
  const catalogFromState = useMarketStore((s) => s.storeCatalogs[store.id]);
  const detailQuery = useStoreDetail(store.id, me.id);
  const publishedProducts = useMemo(() => {
    const list =
      catalogFromState?.products ?? detailQuery.data?.catalog.products ?? [];
    return list.filter((p) => p.published);
  }, [catalogFromState, detailQuery.data]);
  const productsLoading =
    categoriesLoading || (!catalogFromState && detailQuery.isLoading);

  const [pickedCategoryId, setPickedCategoryId] = useState<string | null>(
    null,
  );
  const [detailDisplayed, setDetailDisplayed] = useState(false);
  const [detailAnimateIn, setDetailAnimateIn] = useState(false);

  const selected =
    categoryMetas.find((m) => m.id === pickedCategoryId) ?? null;

  const idToSlug = useMemo(
    () => assignUniqueCategorySlugs(categories),
    [categories],
  );

  const listingLeaves = useMemo(() => {
    if (!pickedCategoryId) return [];
    return leafDescendantsUnderRoot(pickedCategoryId, categories);
  }, [pickedCategoryId, categories]);

  const productsByLeaf = useMemo(() => {
    if (!pickedCategoryId || listingLeaves.length === 0) {
      return new Map<string, StoreProduct[]>();
    }
    const leafIdSet = new Set(listingLeaves.map((l) => l.id));
    const map = new Map<string, StoreProduct[]>();
    for (const leaf of listingLeaves) map.set(leaf.id, []);
    for (const p of publishedProducts) {
      const leafKey = resolveProductLeafId(p, leafIdSet, categories);
      if (leafKey && map.has(leafKey)) map.get(leafKey)!.push(p);
    }
    return map;
  }, [pickedCategoryId, listingLeaves, publishedProducts, categories]);

  const closeCategorySheet = useCallback(() => {
    if (mdUp) return;
    if (sheetCloseTimerRef.current != null) {
      clearTimeout(sheetCloseTimerRef.current);
      sheetCloseTimerRef.current = null;
    }
    setDetailAnimateIn(false);
    sheetCloseTimerRef.current = globalThis.setTimeout(() => {
      sheetCloseTimerRef.current = null;
      setDetailDisplayed(false);
      setPickedCategoryId(null);
    }, PANEL_TRANSITION_MS);
  }, [mdUp]);

  const openCategorySheet = useCallback(
    (categoryId: string) => {
      if (mdUp) {
        if (sheetCloseTimerRef.current != null) {
          clearTimeout(sheetCloseTimerRef.current);
          sheetCloseTimerRef.current = null;
        }
        setPickedCategoryId(categoryId);
        return;
      }
      if (sheetCloseTimerRef.current != null) {
        clearTimeout(sheetCloseTimerRef.current);
        sheetCloseTimerRef.current = null;
      }
      setPickedCategoryId(categoryId);
      setDetailDisplayed(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setDetailAnimateIn(true));
      });
    },
    [mdUp],
  );

  const [displayed, setDisplayed] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (open) {
      setDisplayed(true);
      if (sheetCloseTimerRef.current != null) {
        clearTimeout(sheetCloseTimerRef.current);
        sheetCloseTimerRef.current = null;
      }
      setDetailAnimateIn(false);
      setDetailDisplayed(false);
      setPickedCategoryId(null);
      const startId = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
      return () => cancelAnimationFrame(startId);
    }
    setAnimateIn(false);
    if (sheetCloseTimerRef.current != null) {
      clearTimeout(sheetCloseTimerRef.current);
      sheetCloseTimerRef.current = null;
    }
    setDetailAnimateIn(false);
    setDetailDisplayed(false);
    setPickedCategoryId(null);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open || !animateIn) return;
    if (mdUp) {
      if (sheetCloseTimerRef.current != null) {
        clearTimeout(sheetCloseTimerRef.current);
        sheetCloseTimerRef.current = null;
      }
      setDetailDisplayed(false);
      setDetailAnimateIn(false);
      if (!categoryMetas.length) {
        setPickedCategoryId(null);
        return;
      }
      setPickedCategoryId((prev) => {
        if (prev && categoryMetas.some((m) => m.id === prev)) return prev;
        return categoryMetas[0]!.id;
      });
    } else {
      if (sheetCloseTimerRef.current != null) {
        clearTimeout(sheetCloseTimerRef.current);
        sheetCloseTimerRef.current = null;
      }
      setDetailDisplayed(false);
      setDetailAnimateIn(false);
      setPickedCategoryId(null);
    }
  }, [open, animateIn, mdUp, categoryMetas]);

  useEffect(() => {
    if (!open && displayed) {
      const id = globalThis.setTimeout(
        () => setDisplayed(false),
        PANEL_TRANSITION_MS,
      );
      return () => globalThis.clearTimeout(id);
    }
    return undefined;
  }, [open, displayed]);

  useEffect(() => {
    if (!displayed) return undefined;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (!mdUp && detailDisplayed && detailAnimateIn) {
        event.stopPropagation();
        closeCategorySheet();
        return;
      }
      onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [
    displayed,
    onClose,
    mdUp,
    detailDisplayed,
    detailAnimateIn,
    closeCategorySheet,
  ]);

  useEffect(() => {
    if (!open || !animateIn) return undefined;
    const id = globalThis.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    });
    return () => globalThis.cancelAnimationFrame(id);
  }, [open, animateIn]);

  useEffect(() => {
    if (mdUp || !detailDisplayed || !detailAnimateIn) return undefined;
    const id = globalThis.requestAnimationFrame(() => {
      detailPanelRef.current
        ?.querySelector<HTMLElement>("button, a")
        ?.focus();
    });
    return () => globalThis.cancelAnimationFrame(id);
  }, [mdUp, detailDisplayed, detailAnimateIn]);

  const onNavigateMobile = useCallback(() => {
    closeCategorySheet();
    onClose();
  }, [closeCategorySheet, onClose]);

  if (!displayed) return null;

  const mainPanelIn =
    animateIn && (!detailDisplayed || !detailAnimateIn || mdUp);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[120]" role="presentation">
        <button
          type="button"
          className={`absolute inset-0 vt-modal-backdrop-btn transition-opacity duration-300 ease-out motion-reduce:transition-none ${
            animateIn ? "opacity-100" : "opacity-0"
          }`}
          aria-label="Cerrar menú de categorías"
          onClick={() => {
            if (!mdUp && detailDisplayed && detailAnimateIn)
              closeCategorySheet();
            else onClose();
          }}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            `store-front-surface fixed inset-y-0 left-0 z-10 flex h-[100dvh] min-h-[100dvh] w-full max-w-full flex-col text-[var(--text)] shadow-[var(--shadow)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:max-w-[min(100vw,1100px)] md:flex-row vt-storefront-offcanvas-panel`,
            mainPanelIn ? "translate-x-0" : "-translate-x-full",
            portalAmbient.className,
          )}
          style={portalAmbient.style}
        >
          <aside className="vt-storefront-offcanvas-aside flex h-full min-h-0 flex-1 flex-col border-b border-[var(--border)] md:h-auto md:w-[min(100%,280px)] md:flex-none md:shrink-0 md:border-b-0 md:border-r md:border-[var(--border)]">
            <div className="shrink-0 border-b border-[var(--border)] px-5 pb-4 pt-4 sm:pb-5 sm:pt-5">
              <div className="flex items-start justify-between gap-3">
                <h2
                  id={titleId}
                  className="text-lg font-extrabold leading-tight text-[var(--text)]"
                >
                  Categorías
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-full p-2 text-[var(--muted)] transition hover:bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] hover:text-[var(--text)] md:hidden"
                  aria-label="Cerrar menú"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <nav
              className="min-h-0 flex-1 overflow-y-auto md:px-2 md:pb-4 md:pt-4"
              aria-label="Categorías principales"
            >
              {categoriesLoading ? (
                <p className="px-5 py-4 text-sm text-slate-500">
                  Cargando categorías…
                </p>
              ) : categoryMetas.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">
                  No hay categorías.
                </p>
              ) : (
                <ul
                  className="grid w-full content-start"
                  style={{
                    minHeight: "100%",
                    gridTemplateRows:
                      categoryMetas.length > 1
                        ? `repeat(${categoryMetas.length}, minmax(3rem, 1fr))`
                        : "auto",
                  }}
                >
                  {categoryMetas.map((cat) => {
                    const sheetOpenForThis =
                      !mdUp &&
                      detailDisplayed &&
                      detailAnimateIn &&
                      pickedCategoryId === cat.id;
                    const desktopActive = mdUp && pickedCategoryId === cat.id;
                    const isHighlighted = sheetOpenForThis || desktopActive;
                    return (
                      <li
                        key={cat.id}
                        className="flex min-h-[3rem] border-b border-[var(--border)] last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() => openCategorySheet(cat.id)}
                          className={cn(
                            "flex h-full w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm font-semibold transition md:rounded-xl md:px-3 md:py-2.5",
                            isHighlighted
                              ? "vt-storefront-offcanvas-nav-item--active shadow-sm md:shadow-sm"
                              : "text-slate-700 hover:bg-stone-50",
                          )}
                          aria-expanded={mdUp ? undefined : sheetOpenForThis}
                          aria-current={desktopActive ? "true" : undefined}
                        >
                          <span className="min-w-0 truncate">{cat.label}</span>
                          <ChevronRight
                            className={`h-4 w-4 shrink-0 ${
                              isHighlighted ? "text-white" : "text-slate-300"
                            }`}
                            aria-hidden
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </nav>
          </aside>

          <div className="vt-storefront-offcanvas-detail hidden min-h-0 min-w-0 flex-1 flex-col md:flex">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-8 sm:py-5">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase leading-relaxed tracking-[0.12em] text-slate-400">
                  Categoría
                </p>
                <p className="vt-storefront-accent-text text-[11px] font-bold uppercase leading-relaxed tracking-[0.12em]">
                  {selected ? selected.label : "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-2 text-[var(--muted)] transition hover:bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] hover:text-[var(--text)]"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
              <OffcanvasDetailBody
                store={store}
                selected={selected}
                listingLeaves={listingLeaves}
                productsByLeaf={productsByLeaf}
                productsLoading={productsLoading}
                idToSlug={idToSlug}
                onNavigate={onClose}
                onProductSelect={onProductSelect}
              />
            </div>
          </div>
        </div>
      </div>

      {detailDisplayed && !mdUp ? (
        <>
          <button
            type="button"
            className={`fixed inset-0 z-[125] bg-slate-900/35 transition-opacity duration-300 ease-out motion-reduce:transition-none ${
              detailAnimateIn ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Cerrar panel de subcategorías"
            onClick={closeCategorySheet}
          />
          <div
            ref={detailPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={detailTitleId}
            className={cn(
              `fixed inset-x-0 bottom-0 z-[130] store-front-surface flex max-h-[min(88dvh,720px)] min-h-[min(52dvh,480px)] flex-col rounded-t-2xl border border-b-0 border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_38%,var(--surface))] text-[var(--text)] shadow-[var(--shadow)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none vt-storefront-offcanvas-panel`,
              detailAnimateIn ? "translate-y-0" : "translate-y-full",
              portalAmbient.className,
            )}
            style={portalAmbient.style}
          >
            <div className="shrink-0 pt-2" aria-hidden>
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-3 sm:px-6">
              <div className="min-w-0 space-y-1">
                <p
                  id={detailTitleId}
                  className="vt-storefront-accent-text text-[11px] font-bold uppercase leading-relaxed tracking-[0.12em]"
                >
                  {selected ? selected.label : "—"}
                </p>
                <p className="text-[11px] font-semibold uppercase leading-relaxed tracking-[0.12em] text-slate-400">
                  Subcategorías y productos
                </p>
              </div>
              <button
                type="button"
                onClick={closeCategorySheet}
                className="shrink-0 rounded-full p-2 text-[var(--muted)] transition hover:bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] hover:text-[var(--text)]"
                aria-label="Cerrar subcategorías"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              <OffcanvasDetailBody
                store={store}
                selected={selected}
                listingLeaves={listingLeaves}
                productsByLeaf={productsByLeaf}
                productsLoading={productsLoading}
                idToSlug={idToSlug}
                onNavigate={onNavigateMobile}
                onProductSelect={onProductSelect}
              />
            </div>
          </div>
        </>
      ) : null}
    </>,
    document.body,
  );
}
