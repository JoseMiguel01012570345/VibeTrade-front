import { useEffect, useMemo, useState, type MouseEvent, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/cn";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { ImageLightbox } from "@shared/components/media/ImageLightbox";
import { CeTransitionModalShell } from "@shared/components/ui/CeTransitionModalShell";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useDominantImageColor } from "@shared/lib/image/useDominantImageColor";
import { buildStorefrontShellCssVars } from "@shared/lib/image/extractDominantColor";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { CATALOG_CURRENCY_CODE } from "@features/market/logic/storeCatalogTypes";
import type { StoreService } from "@features/market/logic/storeCatalogTypes";
import { storeHref } from "@features/market/logic/store/storePath";
import { toggleOfferLike } from "@features/market/api/offerEngagementApi";
import { applyOfferLikeResult } from "@features/market/logic/applyOfferLikeResult";
import { toastApiError } from "@features/auth/logic/toastApiError";
import { OfferSaveButton } from "@features/market/components/OfferSaveButton";
import { OfferImageLikeButton } from "@features/market/components/OfferImageLikeButton";
import { getSessionToken } from "@shared/services/http/sessionToken";
import { isToolPlaceholderUrl } from "@features/market/logic/toolPlaceholder";
import { cartLineKey, useCartStore } from "@features/orders/logic/cartStore";
import {
  storefrontOrganicQtyClass,
  storefrontOrganicQtyBtnClass,
  storefrontOrganicBtnForestIconClass,
  storefrontOrganicOverlaySaveClass,
  storefrontOrganicOverlayLikeClass,
} from "@shared/styles/organicCardStyles";
import { ProductCardCartIcon } from "./ProductCardCartIcon";

type Props = Readonly<{
  service: StoreService | null;
  storeName?: string;
  isOpen: boolean;
  onClose: () => void;
}>;

function ServiceGallery({
  gallery,
  alt,
  onOpenLightbox,
  offerId,
  liked,
  likeCount,
  canLike,
  onToggleLike,
}: Readonly<{
  gallery: string[];
  alt: string;
  onOpenLightbox: (url: string) => void;
  offerId: string;
  liked: boolean;
  likeCount: number;
  canLike: boolean;
  onToggleLike: () => void;
}>) {
  const [activeImage, setActiveImage] = useState(0);
  const currentImage = gallery[activeImage] ?? gallery[0] ?? null;
  const currentIsTool = currentImage ? isToolPlaceholderUrl(currentImage) : false;

  return (
    <div className="relative min-w-0">
      <div className="overflow-hidden rounded-[10px] bg-[var(--surface)] p-2 sm:p-3 shadow-[0_12px_30px_rgba(33,37,41,0.05)]">
        {currentImage ? (
          <div className="relative aspect-square w-full">
            <ProtectedMediaImg
              src={currentImage}
              alt={alt}
              wrapperClassName="h-full w-full"
              className={cn(
                "h-full w-full",
                currentIsTool ? "vt-img-tool-placeholder p-6 sm:p-10" : "object-cover"
              )}
            />
            {!currentIsTool ? (
              <button
                type="button"
                className="absolute inset-0 cursor-zoom-in bg-transparent"
                aria-label="Ver imagen a pantalla completa"
                title="Ver imagen a pantalla completa"
                onClick={() => onOpenLightbox(currentImage)}
              />
            ) : null}
            <OfferSaveButton offerId={offerId} className={storefrontOrganicOverlaySaveClass} />
            <OfferImageLikeButton
              liked={liked}
              likeCount={likeCount}
              canLike={canLike}
              onToggle={onToggleLike}
              className={storefrontOrganicOverlayLikeClass}
            />
          </div>
        ) : (
          <div className="relative flex aspect-square w-full items-center justify-center rounded-[4px] bg-stone-100 text-sm text-slate-400">
            Sin foto
            <OfferSaveButton offerId={offerId} className={storefrontOrganicOverlaySaveClass} />
          </div>
        )}
      </div>

      {gallery.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {gallery.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActiveImage(index)}
              className={cn(
                "relative overflow-hidden rounded-[4px] border bg-[var(--surface)]",
                index === activeImage
                  ? "border-[var(--primary)] ring-2 ring-[color-mix(in_oklab,var(--primary)_22%,var(--surface))]"
                  : "border-[var(--border)]"
              )}
            >
              <ProtectedMediaImg
                src={src}
                alt={`${alt} — imagen ${index + 1}`}
                wrapperClassName="aspect-square w-full"
                className={cn(
                  "h-full w-full",
                  isToolPlaceholderUrl(src) ? "vt-img-tool-placeholder p-1.5" : "object-cover"
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ContentProps = Readonly<{
  service: StoreService;
  storeName?: string;
  onClose: () => void;
}>;

function ModalContent({ service, storeName, onClose }: ContentProps) {
  const s = service;
  const isSessionActive = useAppStore((st) => st.isSessionActive);
  const me = useAppStore((st) => st.me);
  const openAuthModal = useAppStore((st) => st.openAuthModal);
  const sessionReady = isSessionActive || !!getSessionToken();
  const resolvedStoreName = storeName ?? useMarketStore((st) => st.stores[s.storeId]?.name) ?? "";

  const catalogLiked = useMarketStore((st) => {
    const svc = st.storeCatalogs[s.storeId]?.services.find((x) => x.id === s.id);
    return svc?.viewerLikedOffer;
  });
  const catalogLikeCount = useMarketStore((st) => {
    const svc = st.storeCatalogs[s.storeId]?.services.find((x) => x.id === s.id);
    return svc?.offerLikeCount;
  });
  const offerLiked = useMarketStore((st) => st.offers[s.id]?.viewerLikedOffer);
  const offerLikeCount = useMarketStore((st) => st.offers[s.id]?.offerLikeCount);
  const canLike = sessionReady && me.id !== "guest";
  const liked = catalogLiked ?? offerLiked ?? s.viewerLikedOffer ?? false;
  const likeCount = catalogLikeCount ?? offerLikeCount ?? s.offerLikeCount ?? 0;

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const items = useCartStore((st) => st.items);
  const addItem = useCartStore((st) => st.addItem);
  const setQuantity = useCartStore((st) => st.setQuantity);
  const removeItem = useCartStore((st) => st.removeItem);

  const displayPrice =
    s.fixedPrice && s.fixedPrice > 0
      ? `$${s.fixedPrice.toFixed(2)} ${CATALOG_CURRENCY_CODE}`
      : null;

  const gallery = useMemo(() => {
    return (s.photoUrls ?? []).map((u) => String(u).trim()).filter(Boolean);
  }, [s.photoUrls]);

  const title = s.nombreServicio || s.category || "Servicio";
  const hasPrice = (s.fixedPrice ?? 0) > 0;
  const canPurchase = hasPrice;

  const cartLine = items.find(
    (l) => l.kind === "service" && l.serviceId === s.id,
  );
  const cartQuantity = cartLine?.quantity ?? 0;
  const lineKey = cartLine
    ? cartLineKey(cartLine)
    : cartLineKey({ kind: "service", serviceId: s.id });

  function currencyBlocked(): boolean {
    return items.length > 0 && items[0]!.currencyCode !== CATALOG_CURRENCY_CODE;
  }

  function warnCurrency() {
    toast.error(
      `Tu carrito usa ${items[0]!.currencyCode}. Finaliza ese pedido o vacía el carrito antes de añadir servicios en ${CATALOG_CURRENCY_CODE}.`,
    );
  }

  function addOne(qty = 1) {
    addItem({
      kind: "service",
      serviceId: s.id,
      storeId: s.storeId,
      name: title,
      unitPrice: s.fixedPrice ?? 0,
      currencyCode: CATALOG_CURRENCY_CODE,
      quantity: qty,
      photoUrl: gallery[0],
    });
    toast.success(`${title} se añadió al carrito.`);
  }

  function handleAddToCart(e?: MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (!canPurchase) return;
    if (currencyBlocked()) {
      warnCurrency();
      return;
    }
    if (cartQuantity === 0) {
      addOne();
    } else {
      setQuantity(lineKey, cartQuantity + 1);
      toast.success(`${title} se añadió al carrito.`);
    }
  }

  function onMinus() {
    if (cartQuantity <= 0) return;
    if (cartQuantity <= 1) removeItem(lineKey);
    else setQuantity(lineKey, cartQuantity - 1);
  }

  function onPlus() {
    if (!canPurchase) return;
    if (cartQuantity === 0) addOne();
    else setQuantity(lineKey, cartQuantity + 1);
  }

  function toggleLikeNow() {
    if (!canLike) {
      openAuthModal();
      return;
    }
    void (async () => {
      try {
        const r = await toggleOfferLike(s.id);
        applyOfferLikeResult(s.id, r, { storeId: s.storeId, catalogKind: "service" });
      } catch (err) {
        toastApiError(err, "No se pudo guardar el me gusta.");
      }
    })();
  }

  const description = s.descripcion?.trim() || "";
  const includes = s.incluye?.trim() || "";
  const excludes = s.noIncluye?.trim() || "";
  const deliverables = s.entregables?.trim() || "";
  const intellectualProperty = s.propIntelectual?.trim() || "";
  const risks = s.riesgos?.enabled ? s.riesgos.items.filter((i) => i.trim()) : [];
  const dependencies = s.dependencias?.enabled
    ? s.dependencias.items.filter((i) => i.trim())
    : [];
  const warranty = s.garantias?.enabled ? s.garantias.texto?.trim() : "";
  const recurrenceLabel = (() => {
    const month = s.recurrenceMonth;
    const day = s.recurrenceDay;
    if (!month || !day) return "";
    const months = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return `Se renueva el ${day} de ${months[month - 1] ?? month}`;
  })();

  function Section({ label, text }: { label: string; text: string }) {
    if (!text) return null;
    return (
      <div className="mt-5">
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
          {text}
        </p>
      </div>
    );
  }

  function ListSection({
    label,
    items,
  }: {
    label: string;
    items: string[];
  }) {
    if (!items.length) return null;
    return (
      <div className="mt-5">
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <ul className="mt-1 list-inside list-disc space-y-1 text-sm leading-6 text-slate-600">
          {items.map((item, idx) => (
            <li key={`${label}-${idx}`}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full max-h-[min(92dvh,800px)] flex-col">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 sm:px-6">
          <Link
            to={storeHref({ id: s.storeId, name: resolvedStoreName })}
            className="truncate text-sm font-bold text-[var(--muted)] hover:text-[var(--primary)] sm:text-base"
            onClick={onClose}
          >
            {resolvedStoreName || "Tienda"}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--bg)] hover:text-[var(--text)]"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <ServiceGallery
              gallery={gallery}
              alt={title}
              onOpenLightbox={setLightboxUrl}
              offerId={s.id}
              liked={liked}
              likeCount={likeCount}
              canLike={canLike}
              onToggleLike={toggleLikeNow}
            />

            <div className="min-w-0">
              <span className="vt-storefront-accent-btn inline-flex w-fit max-w-full truncate rounded-full px-3 py-1 text-[10px] font-bold text-white">
                {s.category || "Servicio"}
              </span>

              <h2 className="mt-3 break-words text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                {title}
              </h2>

              {displayPrice ? (
                <div className="mt-5 border-y border-[#e5ddd5] py-5">
                  <span className="block truncate text-2xl font-extrabold leading-none text-[#d9532b] sm:text-4xl">
                    {displayPrice}
                  </span>
                </div>
              ) : null}

              {description ? (
                <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                  {description}
                </p>
              ) : null}

              {includes ? (
                <div className="mt-5">
                  <p className="text-sm font-bold text-slate-700">Incluye</p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {includes}
                  </p>
                </div>
              ) : null}

              <Section label="No incluye" text={excludes} />
              <ListSection label="Riesgos" items={risks} />
              <ListSection label="Dependencias" items={dependencies} />
              <Section label="Entregables" text={deliverables} />
              <Section label="Garantías" text={warranty} />
              <Section label="Propiedad intelectual" text={intellectualProperty} />
              {recurrenceLabel ? (
                <div className="mt-5">
                  <p className="text-sm font-bold text-slate-700">Recurrencia</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {recurrenceLabel}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--surface)] p-4 sm:px-6">
          {canPurchase ? (
            <div className="flex items-center justify-between gap-2">
              <div className={`${storefrontOrganicQtyClass} shrink-0`}>
                <button
                  type="button"
                  onClick={onMinus}
                  className={storefrontOrganicQtyBtnClass}
                  aria-label="Reducir cantidad"
                  disabled={cartQuantity <= 0}
                >
                  −
                </button>
                <span className="min-w-[1.25rem] shrink-0 text-center tabular-nums">{cartQuantity}</span>
                <button
                  type="button"
                  onClick={onPlus}
                  className={storefrontOrganicQtyBtnClass}
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className={storefrontOrganicBtnForestIconClass}
                disabled={!canPurchase}
                onClick={handleAddToCart}
                aria-label={`Añadir ${title} al carrito`}
              >
                <ProductCardCartIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Este servicio no está disponible para la compra en este momento.
            </div>
          )}
        </div>
      </div>

      <ImageLightbox
        url={lightboxUrl}
        onClose={() => setLightboxUrl(null)}
      />
    </>
  );
}

export function StorefrontServiceModal({
  service,
  storeName,
  isOpen,
  onClose,
}: Props) {
  const [lastService, setLastService] = useState<StoreService | null>(service);
  const colorScheme = useAppStore((s) => s.colorScheme);
  const displayedService = service || lastService;
  const photoUrl = (displayedService?.photoUrls ?? [])[0] || null;
  const imageRgb = useDominantImageColor(photoUrl, true, "storefront-surface");
  const imageStyle = useMemo<CSSProperties>(
    () => buildStorefrontShellCssVars(imageRgb, colorScheme) as CSSProperties,
    [imageRgb, colorScheme],
  );
  useEffect(() => {
    if (service) setLastService(service);
  }, [service]);

  if (!displayedService) return null;

  return (
    <CeTransitionModalShell
      show={isOpen}
      onClose={onClose}
      size="4xl"
      dismissible
      panelClassName={cn(
        "max-h-[min(92dvh,800px)] overflow-hidden rounded-2xl bg-[var(--surface)]",
        "vt-storefront-ambient store-front-surface",
      )}
      panelStyle={imageStyle}
    >
      <ModalContent service={displayedService} storeName={storeName} onClose={onClose} />
    </CeTransitionModalShell>
  );
}
