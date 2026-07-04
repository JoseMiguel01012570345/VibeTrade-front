import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, Truck } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { isToolPlaceholderUrl } from "@features/market/logic/toolPlaceholder";
import type { Offer, StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import { storeHref } from "@features/market/logic/store/storePath";
import type {
  StoreProduct,
  StoreService,
} from "@features/market/logic/storeCatalogTypes";
import { StorefrontProductCard } from "@features/storefront/components/StorefrontProductCard";
import { OfferSaveButton } from "./OfferSaveButton";
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
}: Readonly<{
  gallery: string[];
  alt: string;
  onOpenLightbox: (url: string) => void;
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
      <div className="rounded-[10px] border border-[#d9d5cf] bg-white p-4 shadow-[0_12px_30px_rgba(33,37,41,0.05)]">
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
      <div className="mt-7 inline-flex items-center gap-5 rounded-full border border-[#d9d5cf] bg-white px-4 py-3 text-lg font-semibold text-slate-600">
        <button
          type="button"
          onClick={() => setQuantity((c) => Math.max(1, c - 1))}
          className="transition hover:text-emerald-700"
          aria-label="Reducir cantidad"
        >
          −
        </button>
        <span className="min-w-6 text-center tabular-nums">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity((c) => c + 1)}
          className="transition hover:text-emerald-700"
          aria-label="Aumentar cantidad"
        >
          +
        </button>
      </div>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          className="flex h-14 w-full items-center justify-center rounded-[6px] bg-emerald-700 text-sm font-bold text-white transition hover:bg-emerald-800"
          onClick={() => onAddToCart(quantity)}
        >
          Añadir al carrito
        </button>
        <button
          type="button"
          className="flex h-14 w-full items-center justify-center rounded-[6px] border border-emerald-700 bg-white text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
          onClick={() => onBuyNow(quantity)}
        >
          Comprar ahora
        </button>
      </div>
    </>
  );
}

/** Acciones de la miga de pan: "me gusta" (o contador si no puede) + guardar. */
function OfferLikeActions({
  offerId,
  canLike,
  liked,
  likeCount,
  onToggleLike,
}: Readonly<{
  offerId: string;
  canLike: boolean;
  liked: boolean;
  likeCount: number;
  onToggleLike: () => void;
}>) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-2">
      {canLike ? (
        <button
          type="button"
          onClick={onToggleLike}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#d9d5cf] bg-white px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
          title={liked ? "Quitar me gusta" : "Me gusta"}
        >
          <Heart
            size={16}
            className={cn(liked && "fill-rose-500 text-rose-500")}
            aria-hidden
          />
          <span className="tabular-nums">{likeCount}</span>
        </button>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-400">
          <Heart size={16} aria-hidden />
          <span className="tabular-nums">{likeCount}</span>
        </span>
      )}
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
      <span className="text-2xl font-extrabold leading-none text-emerald-700 sm:text-4xl lg:text-[3.3rem]">
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
 * Servicios: "Escribir al privado" (abre el chat operativo del vendedor). Sustituye
 * a las acciones de compra cuando la oferta no es comprable por carrito.
 */
function ServiceContactBlock({
  onContactSeller,
  contactBusy,
}: Readonly<{
  onContactSeller?: () => void;
  contactBusy: boolean;
}>) {
  if (!onContactSeller) return null;
  return (
    <div className="mt-8">
      <button
        type="button"
        className="flex h-14 w-full items-center justify-center gap-2 rounded-[6px] bg-emerald-700 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        onClick={onContactSeller}
        disabled={contactBusy}
      >
        <MessageCircle size={18} aria-hidden />
        {contactBusy ? "Abriendo chat…" : "Escribir al privado"}
      </button>
    </div>
  );
}

/**
 * Detalle de producto (vista de cliente). Réplica de la UI/UX del `ProductDetail`
 * de la app de referencia (frontend-guest, `src/pages/ProductDetail.tsx`):
 * miga de pan, galería a la izquierda y columna de información a la derecha (pill
 * de categoría, nombre, precio grande en verde, precio unitario, presentación,
 * descripción, selector de cantidad y acciones "Añadir al carrito" / "Comprar
 * ahora" + "Logística Segura"). Debajo, un grid de otros productos de la tienda.
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
  onContactSeller,
  contactBusy = false,
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
  /**
   * Servicios: abre el chat operativo con el vendedor ("Escribir al privado"). Si no
   * se pasa (p. ej. la oferta es del propio dueño), no se muestra el botón.
   */
  onContactSeller?: () => void;
  contactBusy?: boolean;
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

  let logisticaLabel = "Logística Segura";
  if (productFicha?.transportIncluded === true)
    logisticaLabel = "Transporte incluido";
  else if (productFicha?.transportIncluded === false)
    logisticaLabel = "Transporte no incluido";

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
            <OfferLikeActions
              offerId={offer.id}
              canLike={canLike}
              liked={liked}
              likeCount={likeCount}
              onToggleLike={onToggleLike}
            />
          </div>

          <ProductGallery
            gallery={gallery}
            alt={offer.title}
            onOpenLightbox={onOpenLightbox}
          />
        </div>

        <aside className="min-w-0 pt-4">
          <span className="inline-flex max-w-full truncate rounded-full bg-emerald-700 px-4 py-1 text-xs font-bold text-white">
            {category}
          </span>
          <h1 className="mt-5 break-words text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
            {offer.title}
          </h1>

          <OfferPriceBlock price={offer.price} measureLabel={measureLabel} />

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
            <ServiceContactBlock
              onContactSeller={onContactSeller}
              contactBusy={contactBusy}
            />
          )}

          <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-slate-600">
            <Truck className="h-5 w-5 text-emerald-700" aria-hidden />
            <span>{logisticaLabel}</span>
          </div>
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
