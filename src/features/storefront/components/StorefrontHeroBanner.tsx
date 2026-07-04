import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { storeMapHref } from "@features/market/logic/store/storePath";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";

export function StorefrontHeroBanner({
  store,
  pitch,
  productCount,
}: Readonly<{
  store: StoreBadge;
  pitch: string;
  productCount: number;
}>) {
  return (
    <section aria-label="Banner principal" className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[60px] bg-slate-300/40 blur-3xl sm:-inset-12"
      />
      <div className="relative overflow-hidden rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-700 to-emerald-600 px-6 py-8 text-white sm:rounded-[28px] sm:px-10 sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">
          Tienda
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-extrabold leading-tight sm:text-3xl">
          {pitch.trim() || `Bienvenido a ${store.name}. Explora nuestro catálogo.`}
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {store.location ? (
            <Link
              to={storeMapHref(store)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-semibold text-white transition hover:bg-white/25"
            >
              <MapPin size={15} aria-hidden /> Ver ubicación
            </Link>
          ) : null}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 font-semibold">
            {productCount} productos
          </span>
        </div>
      </div>
    </section>
  );
}
