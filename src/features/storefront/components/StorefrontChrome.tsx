import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeCheck, Search, ShoppingCart, Store } from "lucide-react";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import { storeHref } from "@features/market/logic/store/storePath";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { useCartStore } from "@features/orders/logic/cartStore";
import { StorefrontSupportModal } from "./StorefrontSupportModal";

const topLinkClass =
  "inline-flex items-center text-xs font-semibold text-slate-600 transition-colors hover:text-emerald-700 sm:text-sm";

/**
 * Cabecera fija (sticky) de la tienda. Réplica de la UI/UX del header de la app de
 * referencia (frontend-guest, `App.tsx`): marca a la izquierda, buscador central y
 * navegación a la derecha (Inicio + carrito con contador). Aquí la "marca" es la
 * tienda (avatar + nombre). El buscador es controlado en el storefront (filtra el
 * catálogo) o navega a `/store/:id?q=` desde otras vistas (p. ej. el detalle).
 */
export function StorefrontHeader({
  store,
  query,
  onQueryChange,
  onOpenSupport,
}: Readonly<{
  store: StoreBadge;
  query?: string;
  onQueryChange?: (value: string) => void;
  onOpenSupport?: () => void;
}>) {
  const nav = useNavigate();
  const cartCount = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0),
  );

  const controlled = onQueryChange !== undefined;
  const [localQuery, setLocalQuery] = useState("");
  const value = controlled ? (query ?? "") : localQuery;

  function onChange(next: string) {
    if (controlled) onQueryChange?.(next);
    else setLocalQuery(next);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (controlled) return;
    const term = localQuery.trim();
    const suffix = term ? `?q=${encodeURIComponent(term)}` : "";
    nav(`${storeHref(store)}${suffix}`);
  }

  const storeHome = storeHref(store);

  /**
   * "Categorías"/"Ayuda" hacen scroll a su sección dentro del storefront (ancla por
   * id); en otras vistas (p. ej. la ficha) no existe la sección, así que navegamos
   * al home de la tienda como alternativa.
   */
  function goToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      nav(storeHome);
    }
  }

  const cartLabel =
    cartCount > 0 ? `Ir al carrito (${cartCount})` : "Ir al carrito";

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1140px] flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 w-full items-center justify-between gap-2 md:contents">
          <Link
            to={storeHome}
            className="flex min-w-0 items-center gap-2.5 md:order-1 md:shrink-0"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
              {store.avatarUrl ? (
                <ProtectedMediaImg
                  src={store.avatarUrl}
                  alt={store.name}
                  wrapperClassName="h-full w-full"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store size={20} aria-hidden />
              )}
            </span>
            <span className="flex min-w-0 items-center gap-1 truncate text-lg font-extrabold tracking-tight text-emerald-700 sm:text-xl md:text-[1.6rem]">
              <span className="truncate">{store.name}</span>
              {store.verified ? (
                <BadgeCheck
                  size={18}
                  className="shrink-0 text-emerald-600"
                  aria-label="Verificada"
                />
              ) : null}
            </span>
          </Link>

          <nav
            className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3 md:order-3 md:ml-auto md:flex-nowrap md:gap-5"
            aria-label="Tienda"
          >
            <button
              type="button"
              className={topLinkClass}
              onClick={() => goToSection("storefront-categorias")}
            >
              Categorías
            </button>
            <Link
              to="/mis-compras"
              className={topLinkClass}
              aria-label="Rastrea tu pedido"
            >
              <span className="sm:hidden">Rastreo</span>
              <span className="hidden sm:inline">Rastrea tu pedido</span>
            </Link>
            <button
              type="button"
              className={topLinkClass}
              onClick={() => {
                if (onOpenSupport) onOpenSupport();
                else goToSection("storefront-ayuda");
              }}
            >
              Ayuda
            </button>
            <Link
              to="/cart"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-100"
              aria-label={cartLabel}
            >
              <ShoppingCart size={18} aria-hidden />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-5 text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </Link>
          </nav>
        </div>

        <form
          onSubmit={onSubmit}
          role="search"
          className="relative w-full md:order-2 md:min-w-0 md:flex-1 md:max-w-xl"
        >
          <input
            type="search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="¿Qué estás buscando?"
            aria-label="Buscar en la tienda"
            className="h-11 w-full rounded-full border border-emerald-100 bg-stone-50 pl-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="submit"
            aria-label="Buscar productos"
            className="absolute right-1.5 top-1/2 z-[1] grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-emerald-700 text-white transition hover:bg-emerald-800"
          >
            <Search size={16} aria-hidden />
          </button>
        </form>
      </div>
    </header>
  );
}

const footerLink =
  "text-sm font-medium text-slate-600 transition hover:text-emerald-700";

/**
 * Pie de página de la tienda. Réplica del `SiteFooter` de la app de referencia
 * (frontend-guest): marca + tagline y columnas de enlaces, con la línea de
 * copyright. Adaptado al contexto de una tienda de VibeTrade.
 */
export function StorefrontFooter({ store }: Readonly<{ store: StoreBadge }>) {
  const tagline =
    store.pitch?.trim() ||
    "Calidad, confianza y buena atención en cada compra.";
  const storeHomeHref = storeHref(store);
  return (
    <footer
      id="storefront-ayuda"
      className="mt-12 scroll-mt-24 border-t border-emerald-100 bg-[#f0ebe6]"
    >
      {/* El pb extra reintegra el espacio de la barra inferior fija que antes daba
          el <main> (pb-[88px]), ahora removido para que la tienda sea full-bleed. */}
      <div className="mx-auto max-w-[1140px] px-4 pt-10 pb-[96px] sm:px-5 sm:pt-14 sm:pb-[112px]">
        <div className="grid grid-cols-1 gap-y-10 sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3 lg:gap-y-0">
          <div className="min-w-0">
            <p className="text-xl font-extrabold tracking-tight text-emerald-700 sm:text-2xl">
              {store.name}
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
              {tagline}
            </p>
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-900 sm:text-sm">
              Servicio al cliente
            </h3>
            <ul className="mt-4 flex flex-col gap-2">
              <li>
                <Link to={storeHomeHref} className={footerLink}>
                  FAQ
                </Link>
              </li>
              <li>
                <Link to={storeHomeHref} className={footerLink}>
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link to={storeHomeHref} className={footerLink}>
                  Términos y condiciones
                </Link>
              </li>
            </ul>
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-900 sm:text-sm">
              Otros
            </h3>
            <ul className="mt-4 flex flex-col gap-2">
              <li>
                <Link to="/home" className={footerLink}>
                  Home
                </Link>
              </li>
              <li>
                <Link to="/mis-compras" className={footerLink}>
                  Rastrea tu pedido
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-emerald-100/80 pt-8 text-center text-xs text-slate-500 sm:mt-12">
          © {new Date().getFullYear()} {store.name}. Todos los derechos
          reservados.
        </p>
      </div>
    </footer>
  );
}

/**
 * Marco (chrome) del storefront: superficie emerald/crema + cabecera fija +
 * contenido + pie de página. Se usa en el catálogo de la tienda y en el detalle
 * de producto para que ambos compartan header/footer.
 */
export function StorefrontChrome({
  store,
  query,
  onQueryChange,
  children,
}: Readonly<{
  store: StoreBadge;
  query?: string;
  onQueryChange?: (value: string) => void;
  children: ReactNode;
}>) {
  const [supportOpen, setSupportOpen] = useState(false);
  return (
    <div className="store-front-surface flex min-h-full flex-col bg-[#f7f3ef] text-slate-900">
      <StorefrontHeader
        store={store}
        query={query}
        onQueryChange={onQueryChange}
        onOpenSupport={() => setSupportOpen(true)}
      />
      <div className="flex-1">{children}</div>
      <StorefrontFooter store={store} />
      <StorefrontSupportModal
        open={supportOpen}
        store={store}
        onClose={() => setSupportOpen(false)}
      />
    </div>
  );
}
