import { Link } from "react-router-dom";

/** Estado mientras se importa un carrito compartido desde `?share=`. */
export function CartImporting() {
  return (
    <div className="mx-auto w-full max-w-[1140px] px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-[3rem]">
        Tu Carrito de Compras
      </h1>
      <p className="mt-2 text-lg text-slate-500">
        Cargando productos del enlace…
      </p>
    </div>
  );
}

/** Estado de carrito vacío con acceso para seguir comprando. */
export function CartEmptyState({ homeHref }: Readonly<{ homeHref: string }>) {
  return (
    <div className="mx-auto w-full max-w-[1140px] px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-[3rem]">
        Tu Carrito de Compras
      </h1>
      <p className="mt-2 text-lg text-slate-500">
        Tu carrito está vacío por ahora.
      </p>
      <div className="mt-6 rounded-[24px] border border-[#d9d5cf] bg-white px-6 py-10 text-center shadow-[0_14px_36px_rgba(33,37,41,0.05)]">
        <p className="text-base text-slate-500">
          Añade productos desde el catálogo para empezar tu pedido.
        </p>
        <Link
          to={homeHref}
          className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-emerald-700 px-7 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          Explorar tienda
        </Link>
      </div>
    </div>
  );
}
