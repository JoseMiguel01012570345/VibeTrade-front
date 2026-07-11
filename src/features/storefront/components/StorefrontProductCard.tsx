import { type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { toastApiError } from "@features/auth/logic/toastApiError";
import {
  CATALOG_CURRENCY_CODE,
  catalogDisplayPriceUsd,
  type StoreProduct,
  normalizeStoreProduct,
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
import { OfferSaveButton } from "@features/market/components/OfferSaveButton";
import { getSessionToken } from "@shared/services/http/sessionToken";
import {
  storefrontOrganicFeedCardClass,
  storefrontOrganicFeedCardCompactClass,
  storefrontOrganicMediaClass,
  storefrontOrganicBtnForestIconClass,
  storefrontOrganicQtyClass,
  storefrontOrganicQtyBtnClass,
} from "@shared/styles/organicCardStyles";
import { ProductCardCartIcon } from "./ProductCardCartIcon";
import { useOfferCardAmbientStyle } from "@shared/lib/image/useOfferCardAmbientStyle";
import { cn } from "@shared/lib/cn";

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
  p: raw,
  compact = false,
  offerAmbient = true,
  offerAmbientImageUrl = null,
  onSelect,
}: Readonly<{
  p: StoreProduct;
  /** Variante compacta (cuadrícula densa); igual que la referencia. */
  compact?: boolean;
  /** Fondo glass teñido con el color dominante de la imagen de la oferta. */
  offerAmbient?: boolean;
  offerAmbientImageUrl?: string | null;
  /** Si se provee, el clic en la tarjeta abre el modal en lugar de navegar a la ficha. */
  onSelect?: (product: StoreProduct) => void;
}>) {
  const p = normalizeStoreProduct(raw);
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
  const offerLiked = useMarketStore((s) => s.offers[p.id]?.viewerLikedOffer);
  const offerLikeCount = useMarketStore((s) => s.offers[p.id]?.offerLikeCount);
  const canLike = sessionReady && me.id !== "guest";
  const liked = catalogLiked ?? offerLiked ?? p.viewerLikedOffer ?? false;
  const likeCount = catalogLikeCount ?? offerLikeCount ?? p.offerLikeCount ?? 0;

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
  const canPurchase = p.availability.length > 0;
  const isSoldOut = !canPurchase;
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

  const cardClass = compact
    ? storefrontOrganicFeedCardCompactClass
    : storefrontOrganicFeedCardClass;
  const productPhoto =
    (p.photoUrls ?? []).map((u) => String(u).trim()).find((u) => u.length > 0) ??
    null;
  const ambientStyle = useOfferCardAmbientStyle(
    offerAmbientImageUrl ?? productPhoto,
    offerAmbient,
  );

  return (
    <article className={cn(cardClass, ambientStyle.className)} style={ambientStyle.style}>
      <div className={`${storefrontOrganicMediaClass} ${compact ? "aspect-[1/1]" : "aspect-[4/3]"}`}>
        {isSoldOut ? (
          <div className="relative block h-full w-full">
            {p.photoUrls[0] ? (
              <ProtectedMediaImg
                src={p.photoUrls[0]}
                alt={p.name}
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover grayscale"
                onImageLoad={ambientStyle.onImageLoad}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[color-mix(in_oklab,var(--organic-cream)_35%,var(--surface))] text-sm text-[var(--muted)]">
                Sin foto
              </div>
            )}
            <div className="absolute inset-0 grid place-items-center bg-black/45">
              <span className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-black uppercase tracking-wider text-white shadow-lg">
                Agotado
              </span>
            </div>
          </div>
        ) : onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(p)}
            className="block h-full w-full text-left"
          >
            {p.photoUrls[0] ? (
              <ProtectedMediaImg
                src={p.photoUrls[0]}
                alt={p.name}
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover"
                onImageLoad={ambientStyle.onImageLoad}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[color-mix(in_oklab,var(--organic-cream)_35%,var(--surface))] text-sm text-[var(--muted)]">
                Sin foto
              </div>
            )}
          </button>
        ) : (
          <Link to={offerHref} className="block h-full w-full">
            {p.photoUrls[0] ? (
              <ProtectedMediaImg
                src={p.photoUrls[0]}
                alt={p.name}
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover"
                onImageLoad={ambientStyle.onImageLoad}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[color-mix(in_oklab,var(--organic-cream)_35%,var(--surface))] text-sm text-[var(--muted)]">
                Sin foto
              </div>
            )}
          </Link>
        )}
        <OfferSaveButton offerId={p.id} overlay />
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
          className={`shrink-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold uppercase tracking-[0.18em] text-[var(--muted)] ${
            compact ? "h-3.5 text-[10px]" : "h-4 text-[11px]"
          }`}
          title={p.category || undefined}
        >
          {p.category || "\u00a0"}
        </p>

        {isSoldOut ? (
          <div className="mt-2 block shrink-0">
            <h3
              className={`overflow-hidden font-extrabold text-[var(--text)] ${
                compact
                  ? "line-clamp-3 h-[4.5rem] text-[1.05rem] leading-6"
                  : "line-clamp-2 h-12 text-lg leading-6"
              }`}
              title={p.name}
            >
              {p.name}
            </h3>
          </div>
        ) : onSelect ? (
          <button
            type="button"
            onClick={() => onSelect(p)}
            className="mt-2 block shrink-0 text-left"
          >
            <h3
              className={`overflow-hidden font-extrabold text-[var(--text)] ${
                compact
                  ? "line-clamp-3 h-[4.5rem] text-[1.05rem] leading-6"
                  : "line-clamp-2 h-12 text-lg leading-6"
              }`}
              title={p.name}
            >
              {p.name}
            </h3>
          </button>
        ) : (
          <Link to={offerHref} className="mt-2 block shrink-0">
            <h3
              className={`overflow-hidden font-extrabold text-[var(--text)] ${
                compact
                  ? "line-clamp-3 h-[4.5rem] text-[1.05rem] leading-6"
                  : "line-clamp-2 h-12 text-lg leading-6"
              }`}
              title={p.name}
            >
              {p.name}
            </h3>
          </Link>
        )}

        <p
          className={`mt-2 shrink-0 overflow-hidden text-[var(--muted)] ${
            compact
              ? "line-clamp-2 h-8 text-xs leading-4"
              : "line-clamp-2 h-10 text-sm leading-5"
          }`}
          title={p.shortDescription.trim() || undefined}
        >
          {p.shortDescription.trim() || "\u00a0"}
        </p>

        <p
          className={`mt-1 shrink-0 overflow-hidden font-semibold text-[color-mix(in_oklab,var(--text)_78%,var(--muted))] ${
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
            className={`vt-organic-badge ${inStockDisplay ? "" : "vt-organic-badge--bad"}`}
          >
            <span className="vt-organic-badge-dot" aria-hidden />
            {inStockDisplay ? "Disponible" : "Agotado"}
          </span>
        </div>

        <div className={`mt-4 shrink-0 ${compact ? "h-7" : "h-8"}`}>
          <span
            className={`block truncate font-extrabold leading-none text-[#d9532b] ${
              compact ? "text-[1.1rem]" : "text-xl sm:text-[1.65rem]"
            }`}
            title={catalogDisplayPriceUsd(p.price)}
          >
            {(p.price ?? "").trim().replace(/\s+(USD|CUP|EUR|ARS|MLC)\s*$/i, "").trim() || p.price}
            <span className="ml-1 text-sm font-bold text-[#d9532b]/80">
              {precioMoneda}
            </span>
          </span>
        </div>

        <div
          className={`mt-4 flex min-w-0 shrink-0 items-center justify-between gap-2 ${compact ? "mt-auto pt-4" : "mt-auto pt-5"}`}
        >
          <div className={`${storefrontOrganicQtyClass} shrink-0`}>
            <button
              type="button"
              className={storefrontOrganicQtyBtnClass}
              disabled={cartQuantity <= 0}
              onClick={onMinus}
              aria-label="Quitar una unidad del carrito"
            >
              −
            </button>
            <span className="min-w-[1.25rem] shrink-0 text-center tabular-nums">
              {cartQuantity}
            </span>
            <button
              type="button"
              className={storefrontOrganicQtyBtnClass}
              disabled={!canPurchase}
              onClick={onPlus}
              aria-label="Añadir una unidad al carrito"
            >
              +
            </button>
          </div>

          <button
            type="button"
            className={storefrontOrganicBtnForestIconClass}
            disabled={!canPurchase}
            onClick={onCartIcon}
            aria-label={`Añadir ${p.name} al carrito`}
          >
            <ProductCardCartIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
