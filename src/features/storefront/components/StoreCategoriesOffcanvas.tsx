import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ChevronRight, X } from "lucide-react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStoreDetail } from "@features/market/hooks/useStoreDetail";
import { storeHref, storeProductHref } from "@features/market/logic/store/storePath";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import type { StoreProduct } from "@features/market/logic/storeCatalogTypes";

/** Debe coincidir con `duration-300` de los paneles. */
const PANEL_TRANSITION_MS = 300;
/** Máximo de productos listados por categoría en el panel (el resto en la página de categoría). */
const MAX_PRODUCTS_IN_PANEL = 60;
/** Mismo breakpoint que Tailwind `md`: hoja inferior solo bajo este ancho. */
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

type DetailBodyProps = {
  store: StoreBadge;
  category: string | null;
  products: StoreProduct[];
  loading: boolean;
  onNavigate: () => void;
};

/** Cuerpo del panel de detalle: productos de la categoría elegida (columna derecha o
 *  hoja inferior). VibeTrade usa categorías planas, así que listamos los productos de
 *  la categoría (no hay subcategorías como en la app de referencia). */
function CategoryDetailBody({
  store,
  category,
  products,
  loading,
  onNavigate,
}: Readonly<DetailBodyProps>) {
  if (!category) {
    return <p className="text-sm text-slate-500">Selecciona una categoría.</p>;
  }
  const seeAllHref = `${storeHref(store)}?cat=${encodeURIComponent(category)}`;
  if (loading) {
    return <p className="text-sm text-slate-500">Cargando productos…</p>;
  }
  if (products.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          No hay productos en esta categoría por ahora. Puedes ver todo el
          catálogo de la tienda.
        </p>
        <Link
          to={seeAllHref}
          onClick={onNavigate}
          className="inline-flex text-sm font-semibold text-emerald-700 underline-offset-4 hover:underline"
        >
          Explorar categoría
        </Link>
      </div>
    );
  }
  const shown = products.slice(0, MAX_PRODUCTS_IN_PANEL);
  const truncated = products.length > MAX_PRODUCTS_IN_PANEL;
  return (
    <>
      <section aria-labelledby="offcanvas-category-heading" className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#ece4dc] pb-2">
          <h3
            id="offcanvas-category-heading"
            className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700"
          >
            {category}
          </h3>
          <Link
            to={seeAllHref}
            onClick={onNavigate}
            className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-emerald-700 hover:underline"
          >
            Ver todos
          </Link>
        </div>

        <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2.5 pt-1 sm:grid-cols-2 md:mt-4 md:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id} className="min-w-0">
              <Link
                to={storeProductHref(store, p.id)}
                onClick={onNavigate}
                className="block truncate text-sm font-normal leading-snug text-slate-600 transition hover:text-emerald-700"
                title={p.name}
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>

        {truncated ? (
          <p className="mt-3 text-xs text-slate-500">
            Mostrando los primeros {MAX_PRODUCTS_IN_PANEL} productos.{" "}
            <Link
              to={seeAllHref}
              onClick={onNavigate}
              className="font-semibold text-emerald-700 hover:underline"
            >
              Ver todos en esta categoría
            </Link>
          </p>
        ) : null}
      </section>

      <div className="mt-8 border-t border-[#ece4dc] pt-6 md:mt-10 md:pt-8">
        <Link
          to={seeAllHref}
          onClick={onNavigate}
          className="inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800"
        >
          Ver todos en {category}
        </Link>
      </div>
    </>
  );
}

/**
 * Menú de categorías de la tienda como offcanvas (réplica de la UI/UX del
 * `CategoriesOffcanvas` de la app de referencia): en desktop, lista de categorías a
 * la izquierda y productos de la categoría activa a la derecha; en móvil, la lista a
 * pantalla completa y una hoja inferior con los productos al tocar una categoría.
 * Adaptado al catálogo por tienda de VibeTrade (categorías planas).
 */
export function StoreCategoriesOffcanvas({
  open,
  onClose,
  store,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  store: StoreBadge;
}>) {
  const mdUp = useMdUp();
  const titleId = useId();
  const detailTitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const sheetCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const me = useAppStore((s) => s.me);
  const catalogFromState = useMarketStore((s) => s.storeCatalogs[store.id]);
  const detailQuery = useStoreDetail(store.id, me.id);
  const products = useMemo(() => {
    const list =
      catalogFromState?.products ?? detailQuery.data?.catalog.products ?? [];
    return list.filter((p) => p.published);
  }, [catalogFromState, detailQuery.data]);
  const loading = !catalogFromState && detailQuery.isLoading;

  const categories = useMemo(() => {
    const fromStore = (store.categories ?? [])
      .map((c) => c.trim())
      .filter(Boolean);
    const fromProducts = products
      .map((p) => p.category.trim())
      .filter(Boolean);
    return Array.from(new Set([...fromStore, ...fromProducts]));
  }, [store.categories, products]);

  const productsByCategory = useMemo(() => {
    const map = new Map<string, StoreProduct[]>();
    for (const c of categories) map.set(c, []);
    for (const p of products) {
      const c = p.category.trim();
      if (!c) continue;
      let arr = map.get(c);
      if (!arr) {
        arr = [];
        map.set(c, arr);
      }
      arr.push(p);
    }
    return map;
  }, [categories, products]);

  const [pickedCategory, setPickedCategory] = useState<string | null>(null);
  const [detailDisplayed, setDetailDisplayed] = useState(false);
  const [detailAnimateIn, setDetailAnimateIn] = useState(false);

  const selectedProducts = pickedCategory
    ? (productsByCategory.get(pickedCategory) ?? [])
    : [];

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
      setPickedCategory(null);
    }, PANEL_TRANSITION_MS);
  }, [mdUp]);

  const openCategorySheet = useCallback(
    (category: string) => {
      if (sheetCloseTimerRef.current != null) {
        clearTimeout(sheetCloseTimerRef.current);
        sheetCloseTimerRef.current = null;
      }
      setPickedCategory(category);
      if (mdUp) return;
      setDetailDisplayed(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setDetailAnimateIn(true));
      });
    },
    [mdUp],
  );

  /** Overlay principal: sigue en el DOM durante la animación de salida. */
  const [displayed, setDisplayed] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      setDisplayed(true);
      if (sheetCloseTimerRef.current != null) {
        clearTimeout(sheetCloseTimerRef.current);
        sheetCloseTimerRef.current = null;
      }
      setDetailAnimateIn(false);
      setDetailDisplayed(false);
      setPickedCategory(null);
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
    setPickedCategory(null);
    return undefined;
  }, [open]);

  /** Desktop: preselecciona la primera categoría (columna derecha); móvil: sin selección. */
  useEffect(() => {
    if (!open || !animateIn) return;
    if (!mdUp) {
      setPickedCategory(null);
      return;
    }
    if (!categories.length) {
      setPickedCategory(null);
      return;
    }
    setPickedCategory((prev) =>
      prev && categories.includes(prev) ? prev : (categories[0] ?? null),
    );
  }, [open, animateIn, mdUp, categories]);

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
          className={`absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity duration-300 ease-out motion-reduce:transition-none ${
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
          className={`fixed inset-y-0 left-0 z-10 flex h-[100dvh] min-h-[100dvh] w-full max-w-full flex-col bg-white shadow-[12px_0_48px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:max-w-[min(100vw,1100px)] md:flex-row ${
            mainPanelIn ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <aside className="flex h-full min-h-0 flex-1 flex-col border-b border-[#ece4dc] bg-white md:h-auto md:w-[min(100%,280px)] md:flex-none md:shrink-0 md:border-b-0 md:border-r md:border-[#ece4dc]">
            <div className="shrink-0 border-b border-[#ece4dc] px-5 pb-4 pt-4 sm:pb-5 sm:pt-5">
              <div className="flex items-start justify-between gap-3">
                <h2
                  id={titleId}
                  className="text-lg font-extrabold leading-tight text-slate-900"
                >
                  Categorías
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-stone-100 hover:text-slate-700 md:hidden"
                  aria-label="Cerrar menú"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>

            <nav
              className="min-h-0 flex-1 overflow-y-auto md:px-2 md:pb-4 md:pt-4"
              aria-label="Categorías de la tienda"
            >
              {loading ? (
                <p className="px-5 py-4 text-sm text-slate-500">
                  Cargando categorías…
                </p>
              ) : categories.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">
                  Esta tienda todavía no tiene categorías.
                </p>
              ) : (
                <ul className="grid w-full content-start">
                  {categories.map((cat) => {
                    const sheetOpenForThis =
                      !mdUp &&
                      detailDisplayed &&
                      detailAnimateIn &&
                      pickedCategory === cat;
                    const desktopActive = mdUp && pickedCategory === cat;
                    const isHighlighted = sheetOpenForThis || desktopActive;
                    return (
                      <li
                        key={cat}
                        className="flex min-h-[3rem] border-b border-[#ece4dc] last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() => openCategorySheet(cat)}
                          className={`flex h-full w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm font-semibold transition md:rounded-xl md:px-3 md:py-2.5 ${
                            isHighlighted
                              ? "bg-emerald-700 text-white shadow-sm"
                              : "text-slate-700 hover:bg-stone-50"
                          }`}
                          aria-expanded={mdUp ? undefined : sheetOpenForThis}
                          aria-current={desktopActive ? "true" : undefined}
                        >
                          <span className="min-w-0 truncate">{cat}</span>
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

          <div className="hidden min-h-0 min-w-0 flex-1 flex-col bg-[#fafaf9] md:flex">
            <div className="flex items-start justify-between gap-4 border-b border-[#ece4dc] bg-white px-5 py-4 sm:px-8 sm:py-5">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase leading-relaxed tracking-[0.12em] text-slate-400">
                  Categoría
                </p>
                <p className="text-[11px] font-bold uppercase leading-relaxed tracking-[0.12em] text-emerald-700">
                  {pickedCategory ?? "—"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-stone-100 hover:text-slate-700"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
              <CategoryDetailBody
                store={store}
                category={pickedCategory}
                products={selectedProducts}
                loading={loading}
                onNavigate={onClose}
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
            aria-label="Cerrar panel de productos"
            onClick={closeCategorySheet}
          />
          <div
            ref={detailPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={detailTitleId}
            className={`fixed inset-x-0 bottom-0 z-[130] flex max-h-[min(88dvh,720px)] min-h-[min(52dvh,480px)] flex-col rounded-t-2xl border border-b-0 border-[#e8e1da] bg-[#fafaf9] shadow-[0_-12px_48px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              detailAnimateIn ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="shrink-0 pt-2" aria-hidden>
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-start justify-between gap-4 border-b border-[#ece4dc] bg-white px-5 py-3 sm:px-6">
              <div className="min-w-0 space-y-1">
                <p
                  id={detailTitleId}
                  className="text-[11px] font-bold uppercase leading-relaxed tracking-[0.12em] text-emerald-700"
                >
                  {pickedCategory ?? "—"}
                </p>
                <p className="text-[11px] font-semibold uppercase leading-relaxed tracking-[0.12em] text-slate-400">
                  Productos de la categoría
                </p>
              </div>
              <button
                type="button"
                onClick={closeCategorySheet}
                className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-stone-100 hover:text-slate-700"
                aria-label="Cerrar productos"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              <CategoryDetailBody
                store={store}
                category={pickedCategory}
                products={selectedProducts}
                loading={loading}
                onNavigate={onNavigateMobile}
              />
            </div>
          </div>
        </>
      ) : null}
    </>,
    document.body,
  );
}
