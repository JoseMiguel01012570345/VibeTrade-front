import { type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { toastApiError } from "@features/auth/logic/toastApiError";
import {
  CATALOG_CURRENCY_CODE,
  catalogDisplayPriceUsd,
  type StoreProduct,
} from "@features/market/logic/storeCatalogTypes";
import { parseProductPriceNumber } from "@features/market/logic/parseProductPrice";
import { storeProductHref } from "@features/market/logic/store/storePath";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { cartLineKey, useCartStore } from "@features/orders/logic/cartStore";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { toggleOfferLike } from "@features/market/api/offerEngagementApi";
import { applyOfferLikeResult } from "@features/market/logic/applyOfferLikeResult";
import { OfferImageLikeButton } from "@features/market/components/OfferImageLikeButton";
import { getSessionToken } from "@shared/services/http/sessionToken";
import { ProductCardCartIcon } from "./ProductCardCartIcon";

function stopCardNavigation(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Tarjeta de producto del storefront (cliente). Réplica del `ProductCard` de la
 * app de referencia (frontend-guest, `src/pages/catalogUi.tsx`): misma
 * estructura, clases y ritmo visual (eyebrow de categoría, título, descripción,
 * medida, pill de disponibilidad, precio en acento naranja y control de
 * cantidad + botón circular de carrito). Adaptada al modelo `StoreProduct` y al
 * `useCartStore` de VibeTrade; el clic en la tarjeta abre la oferta `/offer/:id`.
 */
export function StorefrontProductCard({
  p,
  compact = false,
}: Readonly<{
  p: StoreProduct;
  /** Variante compacta (cuadrícula densa); igual que la referencia. */
  compact?: boolean;
}>) {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const me = useAppStore((s) => s.me);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const sessionReady = isSessionActive || !!getSessionToken();
  const storeName = useMarketStore((s) => s.stores[p.storeId]?.name);
  const catalogLiked = useMarketStore((s) => {
    const prod = s.storeCatalogs[p.storeId]?.products.find((x) => x.id === p.id);
    return prod?.viewerLikedOffer;
  });
  const catalogLikeCount = useMarketStore((s) => {
    const prod = s.storeCatalogs[p.storeId]?.products.find((x) => x.id === p.id);
    return prod?.offerLikeCount;
  });
  const canLike = sessionReady && me.id !== "guest";
  const liked = catalogLiked ?? p.viewerLikedOffer ?? false;
  const likeCount = catalogLikeCount ?? p.offerLikeCount ?? 0;

  const precioMoneda = CATALOG_CURRENCY_CODE;
  const offerHref = storeProductHref({ id: p.storeId, name: storeName ?? "" }, p.id);

  const cartLine = items.find(
    (l) => l.kind === "product" && l.productId === p.id,
  );
  const cartQuantity = cartLine?.quantity ?? 0;
  const lineKey = cartLine ? cartLineKey(cartLine) : cartLineKey({
    kind: "product",
    productId: p.id,
    serviceId: undefined,
  });
  const canPurchase = p.availability.trim().length > 0;
  const inStockDisplay = canPurchase;

  const measureLabel = p.model?.trim() ?? "";

  function currencyBlocked(): boolean {
    return items.length > 0 && items[0]!.currencyCode !== precioMoneda;
  }

  function warnCurrency() {
    toast.error(
      `Tu carrito usa ${items[0]!.currencyCode}. Finaliza ese pedido o vacía el carrito antes de añadir productos en ${precioMoneda}.`,
    );
  }

  function addOne() {
    addItem({
      kind: "product",
      productId: p.id,
      storeId: p.storeId,
      name: p.name,
      unitPrice: parseProductPriceNumber(p.price) ?? 0,
      currencyCode: precioMoneda,
      quantity: 1,
      photoUrl: p.photoUrls[0],
    });
    toast.success(`${p.name} se añadió al carrito.`);
  }

  function onMinus(e: MouseEvent) {
    stopCardNavigation(e);
    if (cartQuantity <= 0) return;
    if (cartQuantity <= 1) removeItem(lineKey);
    else setQuantity(lineKey, cartQuantity - 1);
  }

  function onPlus(e: MouseEvent) {
    stopCardNavigation(e);
    if (!canPurchase) return;
    if (currencyBlocked()) {
      warnCurrency();
      return;
    }
    if (cartQuantity === 0) {
      addOne();
      return;
    }
    else setQuantity(lineKey, cartQuantity + 1);
  }

  function onCartIcon(e: MouseEvent) {
    stopCardNavigation(e);
    if (!canPurchase) return;
    if (currencyBlocked()) {
      warnCurrency();
      return;
    }
    addOne();
  }

  function toggleLikeNow() {
    if (!canLike) {
      openAuthModal();
      return;
    }
    void (async () => {
      try {
        const r = await toggleOfferLike(p.id);
        applyOfferLikeResult(p.id, r, {
          storeId: p.storeId,
          catalogKind: "product",
        });
      } catch (err) {
        toastApiError(err, "No se pudo guardar el me gusta.");
      }
    })();
  }

  return (
    <article
      className={`group flex h-full min-w-0 flex-col rounded-[18px] border border-[#d9d5cf] bg-white p-3 shadow-[0_12px_30px_rgba(33,37,41,0.05)] transition hover:-translate-y-1 hover:shadow-[0_20px_36px_rgba(33,37,41,0.08)] ${
        compact ? "rounded-[14px] p-2.5" : ""
      }`}
    >
      <div className="relative">
        <Link to={offerHref} className="block">
          {p.photoUrls[0] ? (
            <ProtectedMediaImg
              src={p.photoUrls[0]}
              alt={p.name}
              wrapperClassName={`w-full overflow-hidden rounded-[14px] ${compact ? "aspect-[1/1]" : "aspect-[4/3]"}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className={`flex w-full items-center justify-center rounded-[14px] bg-stone-100 text-sm text-slate-400 ${
                compact ? "aspect-[1/1]" : "aspect-[4/3]"
              }`}
            >
              Sin foto
            </div>
          )}
        </Link>
        <OfferImageLikeButton
          liked={liked}
          likeCount={likeCount}
          canLike={canLike}
          onToggle={toggleLikeNow}
        />
      </div>

      <div
        className={`flex min-w-0 flex-1 flex-col ${compact ? "px-1 pt-3" : "px-1 pt-4"}`}
      >
        <p
          className={`shrink-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold uppercase tracking-[0.18em] text-slate-400 ${
            compact ? "h-3.5 text-[10px]" : "h-4 text-[11px]"
          }`}
          title={p.category || undefined}
        >
          {p.category || "\u00a0"}
        </p>

        <Link to={offerHref} className="mt-2 block shrink-0">
          <h3
            className={`overflow-hidden font-extrabold text-slate-900 ${
              compact
                ? "line-clamp-3 h-[4.5rem] text-[1.05rem] leading-6"
                : "line-clamp-2 h-12 text-lg leading-6"
            }`}
            title={p.name}
          >
            {p.name}
          </h3>
        </Link>

        <p
          className={`mt-2 shrink-0 overflow-hidden text-slate-500 ${
            compact
              ? "line-clamp-2 h-8 text-xs leading-4"
              : "line-clamp-2 h-10 text-sm leading-5"
          }`}
          title={p.shortDescription.trim() || undefined}
        >
          {p.shortDescription.trim() || "\u00a0"}
        </p>

        <p
          className={`mt-1 shrink-0 overflow-hidden font-semibold text-slate-600 ${
            compact
              ? "h-4 truncate text-xs leading-4"
              : "h-5 truncate text-sm leading-5"
          }`}
          title={measureLabel || undefined}
        >
          {measureLabel || "\u00a0"}
        </p>

        <div
          className={`mt-3 flex h-7 shrink-0 flex-wrap items-center gap-2 ${compact ? "mt-2" : ""}`}
        >
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
              inStockDisplay
                ? "bg-emerald-100 text-emerald-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${inStockDisplay ? "bg-emerald-600" : "bg-red-600"}`}
              aria-hidden
            />
            {inStockDisplay ? "Disponible" : "No disponible"}
          </span>
        </div>

        <div className={`mt-4 shrink-0 ${compact ? "h-7" : "h-8"}`}>
          <span
            className={`block truncate font-extrabold leading-none text-[#d9532b] ${
              compact ? "text-[1.1rem]" : "text-xl sm:text-[1.65rem]"
            }`}
            title={catalogDisplayPriceUsd(p.price)}
          >
            {p.price}
            <span className="ml-1 text-sm font-bold text-[#d9532b]/80">
              {precioMoneda}
            </span>
          </span>
        </div>

        <div
          className={`mt-4 grid min-w-0 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 ${compact ? "mt-auto pt-4" : "mt-auto pt-5"}`}
        >
          <div className="flex w-fit max-w-full items-center gap-0.5 justify-self-start rounded-full border border-[#d9d5cf] px-1.5 py-1 text-sm font-semibold text-slate-600 sm:gap-1 sm:px-2 sm:py-1.5">
            <button
              type="button"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d9d5cf] transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8"
              disabled={cartQuantity <= 0}
              onClick={onMinus}
              aria-label="Quitar una unidad del carrito"
            >
              −
            </button>
            <span className="min-w-[1.25rem] shrink-0 text-center tabular-nums sm:min-w-[1.5rem]">
              {cartQuantity}
            </span>
            <button
              type="button"
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d9d5cf] transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8"
              disabled={!canPurchase}
              onClick={onPlus}
              aria-label="Añadir una unidad al carrito"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center justify-self-end rounded-full bg-emerald-700 text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!canPurchase}
            onClick={onCartIcon}
            aria-label={`Añadir ${p.name} al carrito`}
          >
            <ProductCardCartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </article>
  );
}
