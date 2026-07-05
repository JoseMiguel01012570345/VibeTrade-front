import { Link } from "react-router-dom";
import { toastApiError } from "@features/auth/logic/toastApiError";
import { Wrench } from "lucide-react";
import { type StoreService } from "@features/market/logic/storeCatalogTypes";
import { normalizeStoreService } from "@features/market/logic/storeCatalogTypes";
import { storeProductHref } from "@features/market/logic/store/storePath";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { toggleOfferLike } from "@features/market/api/offerEngagementApi";
import { applyOfferLikeResult } from "@features/market/logic/applyOfferLikeResult";
import { OfferImageLikeButton } from "@features/market/components/OfferImageLikeButton";
import { OfferSaveButton } from "@features/market/components/OfferSaveButton";
import { getSessionToken } from "@shared/services/http/sessionToken";

/**
 * Tarjeta de servicio del storefront (cliente). Comparte la misma estructura, clases
 * y ritmo visual que `StorefrontProductCard` (eyebrow de categoría, título,
 * descripción), pero sin precio ni control de carrito: un servicio no se compra en el
 * carrito, se contrata escribiendo al privado desde su ficha. Una insignia "Servicio"
 * lo diferencia de los productos y el clic abre el detalle `/{tienda}/{id}`.
 */
export function StorefrontServiceCard({
  s: raw,
  compact = false,
}: Readonly<{
  s: StoreService;
  /** Variante compacta (cuadrícula densa); igual que la tarjeta de producto. */
  compact?: boolean;
}>) {
  const s = normalizeStoreService(raw);
  const storeName = useMarketStore((st) => st.stores[s.storeId]?.name);
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
  const isSessionActive = useAppStore((st) => st.isSessionActive);
  const me = useAppStore((st) => st.me);
  const openAuthModal = useAppStore((st) => st.openAuthModal);
  const sessionReady = isSessionActive || !!getSessionToken();
  const canLike = sessionReady && me.id !== "guest";
  const liked = catalogLiked ?? offerLiked ?? s.viewerLikedOffer ?? false;
  const likeCount = catalogLikeCount ?? offerLikeCount ?? s.offerLikeCount ?? 0;
  const detailHref = storeProductHref(
    { id: s.storeId, name: storeName ?? "" },
    s.id,
  );

  const photo = (s.photoUrls ?? [])
    .map((u) => String(u).trim())
    .find((u) => u.length > 0);
  const title = s.nombreServicio || s.category || "Servicio";
  const description = s.descripcion;

  function toggleLikeNow() {
    if (!canLike) {
      openAuthModal();
      return;
    }
    void (async () => {
      try {
        const r = await toggleOfferLike(s.id);
        applyOfferLikeResult(s.id, r, {
          storeId: s.storeId,
          catalogKind: "service",
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
        <Link to={detailHref} className="block">
          {photo ? (
            <ProtectedMediaImg
              src={photo}
              alt={title}
              wrapperClassName={`w-full overflow-hidden rounded-[14px] ${compact ? "aspect-[1/1]" : "aspect-[4/3]"}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className={`flex w-full items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-600 ${
                compact ? "aspect-[1/1]" : "aspect-[4/3]"
              }`}
            >
              <Wrench className="h-9 w-9" aria-hidden />
            </div>
          )}
        </Link>
        <OfferSaveButton offerId={s.id} overlay />
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
          title={s.category || undefined}
        >
          {s.category || "\u00a0"}
        </p>

        <Link to={detailHref} className="mt-2 block shrink-0">
          <h3
            className={`overflow-hidden font-extrabold text-slate-900 ${
              compact
                ? "line-clamp-3 h-[4.5rem] text-[1.05rem] leading-6"
                : "line-clamp-2 h-12 text-lg leading-6"
            }`}
            title={title}
          >
            {title}
          </h3>
        </Link>

        <p
          className={`mt-2 shrink-0 overflow-hidden text-slate-500 ${
            compact
              ? "line-clamp-2 h-8 text-xs leading-4"
              : "line-clamp-2 h-10 text-sm leading-5"
          }`}
          title={description || undefined}
        >
          {description || "\u00a0"}
        </p>

        <div
          className={`mt-3 flex h-7 shrink-0 flex-wrap items-center gap-2 ${compact ? "mt-2" : ""}`}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
            <Wrench className="h-3 w-3 shrink-0" aria-hidden />
            Servicio
          </span>
        </div>

        <div className={`shrink-0 ${compact ? "mt-auto pt-4" : "mt-auto pt-5"}`}>
          <Link
            to={detailHref}
            className="flex h-11 w-full items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white transition hover:bg-emerald-800"
          >
            Ver servicio
          </Link>
        </div>
      </div>
    </article>
  );
}
