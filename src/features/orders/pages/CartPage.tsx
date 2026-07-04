import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, Share2, Trash2 } from "lucide-react";
import { cartSubtotal, useCartStore, type CartItem } from "../logic/cartStore";
import {
  buildShareCartPath,
  buildShareCartUrl,
  cartMatchesShareParam,
  decodeShareCartParam,
  importSharedCartItems,
} from "../logic/shareCart";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStoreDetail } from "@features/market/hooks/useStoreDetail";
import { storeHref } from "@features/market/logic/store/storePath";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import type { StoreProduct } from "@features/market/logic/storeCatalogTypes";
import { StorefrontChrome, StorefrontProductCard } from "@features/storefront";

const CART_PATH = "/cart";

/** Etiqueta de precio con el mismo formato que la app de referencia: "$1.08 USD". */
function priceTag(amount: number, currency: string): string {
  const c = currency.trim();
  const value = Number.isFinite(amount) ? amount : 0;
  const suffix = c ? ` ${c}` : "";
  return `$${value.toFixed(2)}${suffix}`;
}

type DetailedLine = CartItem & { product: StoreProduct | null };

/** Fila de un artículo del carrito (imagen, nombre, presentación, precio, cantidad y quitar). */
function CartLineRow({
  line,
  isLast,
  onSetQuantity,
  onRemove,
}: Readonly<{
  line: DetailedLine;
  isLast: boolean;
  onSetQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}>) {
  const offerHref = `/offer/${encodeURIComponent(line.productId)}`;
  const photo = line.photoUrl || line.product?.photoUrls[0] || "";
  const measure = line.product?.model?.trim() || "Presentación estándar";
  return (
    <div
      className={`flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
        isLast ? "" : "border-b border-[#f0ebe5]"
      }`}
    >
      <div className="flex items-center gap-4">
        <Link
          to={offerHref}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-stone-100"
        >
          {photo ? (
            <ProtectedMediaImg
              src={photo}
              alt={line.name}
              wrapperClassName="h-full w-full"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[10px] font-semibold text-slate-400">
              Sin foto
            </span>
          )}
        </Link>

        <div className="min-w-0">
          <Link
            to={offerHref}
            className="block truncate text-[0.98rem] font-bold text-slate-900 transition hover:text-emerald-700"
          >
            {line.name}
          </Link>
          <p className="mt-0.5 text-[0.82rem] text-slate-500">
            {measure}
            {line.currencyCode ? ` · ${line.currencyCode}` : ""}
          </p>
          <p className="mt-1 text-[0.92rem] font-bold text-emerald-700">
            {priceTag(line.unitPrice, line.currencyCode)}
          </p>
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-nowrap sm:justify-end">
        <div className="inline-flex items-center gap-4 rounded-full border border-[#ddd5ce] bg-white px-3 py-1.5 text-[0.95rem] font-semibold text-slate-600">
          <button
            type="button"
            onClick={() =>
              onSetQuantity(line.productId, Math.max(1, line.quantity - 1))
            }
            className="transition hover:text-emerald-700"
            aria-label={`Reducir cantidad de ${line.name}`}
          >
            −
          </button>
          <span className="min-w-5 text-center tabular-nums">
            {line.quantity}
          </span>
          <button
            type="button"
            onClick={() => onSetQuantity(line.productId, line.quantity + 1)}
            className="transition hover:text-emerald-700"
            aria-label={`Aumentar cantidad de ${line.name}`}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => onRemove(line.productId)}
          className="text-[#d9532b] transition hover:text-[#bf4420]"
          aria-label={`Quitar ${line.name}`}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/** Tarjeta de resumen del pedido + acciones (proceder al pago / compartir carrito). */
function OrderSummaryCard({
  units,
  subtotal,
  currency,
  onCheckout,
  onShare,
  sharing,
  shareDisabled,
}: Readonly<{
  units: number;
  subtotal: number;
  currency: string;
  onCheckout: () => void;
  onShare: () => void;
  sharing: boolean;
  shareDisabled: boolean;
}>) {
  return (
    <aside className="flex min-w-0 flex-col gap-4 lg:flex-[4] lg:sticky lg:top-28">
      <div className="rounded-[10px] border border-[#dbe2ee] bg-[#eaf1ff] p-4 shadow-[0_10px_22px_rgba(33,37,41,0.05)]">
        <h2 className="text-[1.15rem] font-extrabold tracking-tight text-slate-900">
          Resumen del Pedido
        </h2>

        <div className="mt-5 space-y-3 text-[0.84rem] text-slate-600">
          <div className="flex items-center justify-between">
            <span>Subtotal ({units} artículos)</span>
            <span className="font-semibold text-slate-700">
              {priceTag(subtotal, currency)}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <span>Envío</span>
            <span className="max-w-[12rem] text-right text-[0.8rem] font-medium leading-snug text-slate-500">
              {currency
                ? `Según ubicación en checkout (${currency})`
                : "Según ubicación en checkout"}
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-[#d8deea] pt-4">
          <div className="flex items-end justify-between gap-4">
            <span className="text-[0.98rem] font-extrabold tracking-tight text-slate-900">
              Total estimado
            </span>
            <span className="text-[1.15rem] font-extrabold tracking-tight text-slate-900">
              {priceTag(subtotal, currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[10px] border border-[#e8edf5] bg-[#f7faff] p-4 shadow-[0_10px_22px_rgba(33,37,41,0.04)]">
        <button
          type="button"
          onClick={onCheckout}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-emerald-700 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          <span>Proceder al pago</span>
          <Lock className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={shareDisabled}
          className="mt-3 flex h-12 w-full items-center justify-center gap-3 rounded-[8px] border border-emerald-700 bg-white text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{sharing ? "Copiando enlace…" : "Compartir carrito"}</span>
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}

function CartImporting() {
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

function EmptyCart({ homeHref }: Readonly<{ homeHref: string }>) {
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

export function CartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shareParam = searchParams.get("share");
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const replaceCart = useCartStore((s) => s.replaceCart);
  const me = useAppStore((s) => s.me);

  const importRunIdRef = useRef(0);
  const appliedShareRef = useRef<string | null>(null);
  const [importingShare, setImportingShare] = useState(false);
  const [sharingCart, setSharingCart] = useState(false);

  const storeId = items[0]?.storeId ?? "";
  const storeFromState = useMarketStore((s) =>
    storeId ? s.stores[storeId] : undefined,
  );
  const catalogFromState = useMarketStore((s) =>
    storeId ? s.storeCatalogs[storeId] : undefined,
  );
  // Carga la tienda del carrito (marca para el header + catálogo para sugeridos)
  // si aún no está en memoria; queda cacheada por react-query.
  const detailQuery = useStoreDetail(storeId || undefined, me.id);

  const store: StoreBadge | undefined =
    storeFromState ?? detailQuery.data?.store;
  const detailProducts = detailQuery.data?.catalog.products;
  const catalogProducts = useMemo(
    () => catalogFromState?.products ?? detailProducts ?? [],
    [catalogFromState, detailProducts],
  );

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const currency = items[0]?.currencyCode ?? "";
  const totalUnits = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const shareCartUrl = useMemo(
    () =>
      items.length
        ? buildShareCartUrl(
            CART_PATH,
            storeId,
            items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          )
        : "",
    [items, storeId],
  );

  // Importa el carrito compartido cuando la URL trae `?share=` (réplica de la
  // referencia): decodifica, resuelve los productos del catálogo y reemplaza.
  useEffect(() => {
    const raw = shareParam?.trim() ?? "";
    if (!raw) {
      appliedShareRef.current = null;
      setImportingShare(false);
      return;
    }
    if (appliedShareRef.current === raw) {
      setImportingShare(false);
      return;
    }
    const decoded = decodeShareCartParam(raw);
    if (!decoded.items.length) {
      toast.error("Enlace de carrito no válido.");
      setImportingShare(false);
      return;
    }
    if (cartMatchesShareParam(items, raw)) {
      appliedShareRef.current = raw;
      setImportingShare(false);
      return;
    }

    const runId = ++importRunIdRef.current;
    setImportingShare(true);
    importSharedCartItems(decoded.storeId, decoded.items, me.id)
      .then((result) => {
        if (runId !== importRunIdRef.current) return;
        if (!result.lines.length) {
          toast.error("No se pudo cargar ningún producto del enlace.");
          return;
        }
        replaceCart(result.lines);
        appliedShareRef.current = raw;
        if (result.skipped.length) {
          toast(
            `${result.skipped.length} producto(s) no se incluyeron (agotados o no disponibles).`,
          );
        } else {
          toast.success("Carrito importado correctamente.");
        }
      })
      .catch(() => {
        if (runId !== importRunIdRef.current) return;
        toast.error("No se pudo importar el carrito compartido.");
      })
      .finally(() => {
        if (runId !== importRunIdRef.current) return;
        setImportingShare(false);
      });
  }, [shareParam, items, me.id, replaceCart]);

  // Mantiene la URL sincronizada con el carrito, para que la barra de direcciones
  // sea siempre un enlace compartible (como en la referencia).
  useEffect(() => {
    if (importingShare) return;
    const targetPath = items.length
      ? buildShareCartPath(
          CART_PATH,
          storeId,
          items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        )
      : CART_PATH;
    const currentPath = `${location.pathname}${location.search}`;
    if (currentPath === targetPath) return;
    navigate(targetPath, { replace: true });
  }, [items, storeId, importingShare, location.pathname, location.search, navigate]);

  async function copyShareCartLink() {
    const url =
      shareCartUrl ||
      (typeof globalThis !== "undefined" ? globalThis.location.href : "");
    if (!url || sharingCart) return;
    setSharingCart(true);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado al portapapeles.");
    } catch {
      toast.error("No se pudo copiar el enlace.");
    } finally {
      setSharingCart(false);
    }
  }

  const detailedLines = useMemo<DetailedLine[]>(
    () =>
      items.map((line) => ({
        ...line,
        product: catalogProducts.find((p) => p.id === line.productId) ?? null,
      })),
    [items, catalogProducts],
  );

  const suggestions = useMemo(() => {
    const inCart = new Set(items.map((i) => i.productId));
    return catalogProducts
      .filter((p) => p.published && !inCart.has(p.id))
      .slice(0, 4);
  }, [catalogProducts, items]);

  const keepShoppingHref = store ? storeHref(store) : "/home";

  let body: ReactNode;
  if (importingShare) {
    body = <CartImporting />;
  } else if (items.length === 0) {
    body = <EmptyCart homeHref={keepShoppingHref} />;
  } else {
    body = (
      <div className="mx-auto w-full max-w-[1140px] px-4 py-6 sm:py-10">
        <Link
          to={keepShoppingHref}
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 lg:hidden"
        >
          <span aria-hidden>←</span>
          <span>Seguir comprando</span>
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-[3.1rem]">
            Tu Carrito de Compras
          </h1>
          <p className="mt-1.5 text-[0.95rem] text-slate-500">
            Revisa tus artículos y procede al pago seguro.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="min-w-0 lg:flex-[6]">
            <div className="overflow-hidden rounded-[12px] border border-[#e3ddd6] bg-white shadow-[0_10px_26px_rgba(33,37,41,0.04)]">
              {detailedLines.map((line, index) => (
                <CartLineRow
                  key={line.productId}
                  line={line}
                  isLast={index === detailedLines.length - 1}
                  onSetQuantity={setQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>

            <Link
              to={keepShoppingHref}
              className="mt-8 hidden items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 lg:inline-flex"
            >
              <span aria-hidden>←</span>
              <span>Seguir comprando</span>
            </Link>
          </div>

          <OrderSummaryCard
            units={totalUnits}
            subtotal={subtotal}
            currency={currency}
            onCheckout={() => navigate("/checkout")}
            onShare={() => void copyShareCartLink()}
            sharing={sharingCart}
            shareDisabled={sharingCart || !shareCartUrl}
          />
        </div>

        {suggestions.length > 0 ? (
          <section className="pt-16 sm:pt-24">
            <h2 className="mb-6 text-[1.05rem] font-extrabold tracking-tight text-slate-900">
              Más productos de esta tienda
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
              {suggestions.map((product) => (
                <StorefrontProductCard key={product.id} p={product} compact />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  if (store) {
    return <StorefrontChrome store={store}>{body}</StorefrontChrome>;
  }

  return (
    <div className="store-front-surface min-h-full bg-[#f7f3ef] pb-[96px] text-slate-900 sm:pb-[112px]">
      {body}
    </div>
  );
}
