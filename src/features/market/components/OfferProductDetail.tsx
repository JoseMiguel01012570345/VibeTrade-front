import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@shared/lib/cn";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { isToolPlaceholderUrl } from "@features/market/logic/toolPlaceholder";
import type { Offer, StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import { storeHref } from "@features/market/logic/store/storePath";
import {
  catalogDisplayPriceUsd,
  type StoreProduct,
  type StoreService,
} from "@features/market/logic/storeCatalogTypes";
import { StorefrontProductCard } from "@features/storefront/components/StorefrontProductCard";
import { OfferSaveButton } from "./OfferSaveButton";
import { OfferImageLikeButton } from "./OfferImageLikeButton";
import { ServiceDetailFields } from "./ServiceDetailFields";

/**
 * Galería del detalle (columna izquierda). Réplica de la app de referencia
 * (frontend-guest, `ProductDetail`): imagen principal `1/1` en tarjeta con borde
 * y miniaturas debajo. Gestiona su propia imagen activa.
 */
function ProductGallery({
  gallery,
  alt,
  onOpenLightbox,
  canLike,
  liked,
  likeCount,
  onToggleLike,
}: Readonly<{
  gallery: string[];
  alt: string;
  onOpenLightbox: (url: string) => void;
  canLike: boolean;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
}>) {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage((prev) =>
      gallery.length === 0 ? 0 : Math.min(prev, gallery.length - 1),
    );
  }, [gallery.length]);

  const currentImage = gallery[activeImage] ?? gallery[0] ?? null;
  const currentIsTool = currentImage ? isToolPlaceholderUrl(currentImage) : false;

  return (
    <>
      <div className="vt-storefront-section-panel rounded-[10px] border p-4 shadow-[0_12px_30px_rgba(33,37,41,0.05)]">
        {currentImage ? (
          <div className="relative">
            <ProtectedMediaImg
              src={currentImage}
              alt={alt}
              wrapperClassName="aspect-[1/1] w-full overflow-hidden rounded-[4px]"
              className={cn(
                "h-full w-full",
                currentIsTool ? "vt-img-tool-placeholder p-8" : "object-contain",
              )}
            />
            {currentIsTool ? null : (
              <button
                type="button"
                className="absolute inset-0 cursor-zoom-in bg-transparent"
                aria-label="Ver imagen a pantalla completa"
                title="Ver imagen a pantalla completa"
                onClick={() => onOpenLightbox(currentImage)}
              />
            )}
            <OfferImageLikeButton
              liked={liked}
              likeCount={likeCount}
              canLike={canLike}
              onToggle={onToggleLike}
            />
          </div>
        ) : (
          <div className="flex aspect-[1/1] w-full items-center justify-center rounded-[4px] bg-stone-100 text-sm text-slate-400">
            Sin foto
          </div>
        )}
      </div>

      {gallery.length > 1 ? (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {gallery.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActiveImage(index)}
              className={cn(
                "relative overflow-hidden rounded-[4px] border bg-white",
                index === activeImage
                  ? "border-emerald-700 ring-2 ring-emerald-100"
                  : "border-[#d9d5cf]",
              )}
            >
              <ProtectedMediaImg
                src={src}
                alt={`${alt} — imagen ${index + 1}`}
                wrapperClassName="aspect-[1/1] w-full"
                className={cn(
                  "h-full w-full",
                  isToolPlaceholderUrl(src)
                    ? "vt-img-tool-placeholder p-2"
                    : "object-cover",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}

/** Acciones de compra (cantidad + botones). Solo se muestra para productos comprables. */
function BuyActions({
  onAddToCart,
  onBuyNow,
}: Readonly<{
  onAddToCart: (qty: number) => void;
  onBuyNow: (qty: number) => void;
}>) {
  const [quantity, setQuantity] = useState(1);

  return (
    <>
      <div className="mt-7 inline-flex items-center gap-5 rounded-full border px-4 py-3 text-lg font-semibold text-slate-600 vt-storefront-control">
        <button
          type="button"
          onClick={() => setQuantity((c) => Math.max(1, c - 1))}
          className="vt-storefront-accent-text transition"
          aria-label="Reducir cantidad"
        >
          −
        </button>
        <span className="min-w-6 text-center tabular-nums">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((c) => c + 1)}
          className="vt-storefront-accent-text transition"
          aria-label="Aumentar cantidad"
        >
          +
        </button>
      </div>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          className="vt-storefront-accent-btn flex h-14 w-full items-center justify-center rounded-[6px] text-sm font-bold text-white transition"
          onClick={() => onAddToCart(quantity)}
        >
          Añadir al carrito
        </button>
        <button
          type="button"
          className="vt-storefront-accent-btn-outline flex h-14 w-full items-center justify-center rounded-[6px] border text-sm font-bold transition"
          onClick={() => onBuyNow(quantity)}
        >
          Comprar ahora
        </button>
      </div>
    </>
  );
}

/** Acciones de la miga de pan: guardar oferta. */
function OfferSaveActions({
  offerId,
}: Readonly<{
  offerId: string;
}>) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-2">
      <OfferSaveButton offerId={offerId} className="border-[#d9d5cf] bg-white" />
    </span>
  );
}

/** Bloque de precio del detalle. En servicios sin precio, solo un separador. */
function OfferPriceBlock({
  price,
  measureLabel,
}: Readonly<{ price: string; measureLabel: string }>) {
  if (!price.trim()) {
    return <div className="mt-7 border-t border-[#e5ddd5] pt-6" />;
  }
  return (
    <div className="mt-7 border-y border-[#e5ddd5] py-6">
      <span className="text-2xl font-extrabold leading-none vt-storefront-accent-text sm:text-4xl lg:text-[3.3rem]">
        {price}
      </span>
      <p className="mt-2 text-sm text-slate-500">
        Precio unitario: {price}
        {measureLabel ? ` · ${measureLabel}` : ""}
      </p>
    </div>
  );
}

/**
 * Servicios sin precio fijo: mensaje informativo (la compra es por checkout).
 */
function ServiceUnavailableBuyBlock() {
  return (
    <div className="mt-8 rounded-[6px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Este servicio aún no tiene precio publicado. Vuelve más tarde o contacta a
      la tienda.
    </div>
  );
}

/**
 * Detalle de producto (vista de cliente). Réplica de la UI/UX del `ProductDetail`
 * de la app de referencia (frontend-guest, `src/pages/ProductDetail.tsx`):
 * miga de pan, galería a la izquierda y columna de información a la derecha (pill
 * de categoría, nombre, precio grande en verde, precio unitario, presentación,
 * descripción, selector de cantidad y acciones "Añadir al carrito" / "Comprar
 * ahora"). Debajo, un grid de otros productos de la tienda.
 */
export function OfferProductDetail({
  offer,
  productFicha,
  serviceFicha,
  store,
  gallery,
  descriptionText,
  purchasable,
  canLike,
  liked,
  likeCount,
  onToggleLike,
  onAddToCart,
  onBuyNow,
  onOpenLightbox,
  relatedProducts,
}: Readonly<{
  offer: Offer;
  productFicha: StoreProduct | null;
  /** Ficha del servicio (cuando la oferta es un servicio); habilita el detalle rico. */
  serviceFicha?: StoreService | null;
  store: StoreBadge;
  gallery: string[];
  descriptionText: string;
  /**
   * La oferta es un producto comprable (no un servicio). Los botones de compra se
   * muestran a cualquier visitante (incluido el dueño), independientemente de que la
   * ficha ya esté cargada.
   */
  purchasable: boolean;
  canLike: boolean;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
  onAddToCart: (qty: number) => void;
  onBuyNow: (qty: number) => void;
  onOpenLightbox: (url: string) => void;
  relatedProducts: StoreProduct[];
}>) {
  const category =
    productFicha?.category?.trim() || offer.tags[0]?.trim() || "Producto";
  const measureLabel = productFicha?.model?.trim() ?? "";
  const description =
    descriptionText.trim() ||
    productFicha?.shortDescription?.trim() ||
    productFicha?.mainBenefit?.trim() ||
    "";
  const canBuy = purchasable;
  const displayPrice =
    serviceFicha && (serviceFicha.fixedPrice ?? 0) > 0
      ? `$${serviceFicha.fixedPrice!.toFixed(2)} USD`
      : catalogDisplayPriceUsd(productFicha?.price?.trim() || offer.price);

  return (
    <div className="space-y-10">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_400px]">
        <div className="min-w-0">
          <div className="mb-6 flex min-w-0 flex-wrap items-center gap-2 text-sm text-slate-400">
            <Link to="/home" className="shrink-0 transition hover:text-emerald-700">
              Inicio
            </Link>
            <span className="shrink-0">›</span>
            <Link
              to={storeHref(store)}
              className="min-w-0 max-w-[40%] truncate transition hover:text-emerald-700 sm:max-w-none sm:whitespace-normal"
            >
              {store.name}
            </Link>
            <span className="shrink-0">›</span>
            <span className="min-w-0 max-w-full truncate font-semibold text-slate-700">
              {offer.title}
            </span>
            <OfferSaveActions offerId={offer.id} />
          </div>

          <ProductGallery
            gallery={gallery}
            alt={offer.title}
            onOpenLightbox={onOpenLightbox}
            canLike={canLike}
            liked={liked}
            likeCount={likeCount}
            onToggleLike={onToggleLike}
          />
        </div>

        <aside className="min-w-0 pt-4">
          <span className="vt-storefront-accent-btn inline-flex max-w-full truncate rounded-full px-4 py-1 text-xs font-bold text-white">
            {category}
          </span>
          <h1 className="mt-5 break-words text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
            {offer.title}
          </h1>

          <OfferPriceBlock price={displayPrice} measureLabel={measureLabel} />

          {measureLabel ? (
            <p className="mt-4 text-sm font-semibold text-slate-700">
              Presentación: {measureLabel}
            </p>
          ) : null}

          {description ? (
            <p className="mt-6 whitespace-pre-line text-base leading-8 text-slate-600">
              {description}
            </p>
          ) : null}

          {offer.tags.length > 0 ? (
            <div className="mt-7 flex flex-wrap gap-2">
              {offer.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {canBuy ? (
            <BuyActions onAddToCart={onAddToCart} onBuyNow={onBuyNow} />
          ) : (
            <ServiceUnavailableBuyBlock />
          )}
        </aside>
      </section>

      {serviceFicha ? (
        <section>
          <ServiceDetailFields s={serviceFicha} />
        </section>
      ) : null}

      {relatedProducts.length > 0 ? (
        <section>
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="min-w-0 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-[2.2rem]">
              Más productos de esta tienda
            </h2>
            <Link
              to={storeHref(store)}
              className="shrink-0 text-sm font-bold text-emerald-700 underline underline-offset-4"
            >
              Ver todo
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {relatedProducts.map((rp) => (
              <StorefrontProductCard key={rp.id} p={rp} compact />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
