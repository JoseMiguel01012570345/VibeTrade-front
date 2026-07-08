import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/cn";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import {
  useSaveOfferMutation,
  useUnsaveOfferMutation,
} from "@features/profile/hooks/useSavedOfferMutations";
import { toastApiError } from "@features/auth/logic/toastApiError";
import {
  storefrontOrganicOverlaySaveClass,
} from "@shared/styles/organicCardStyles";

type Props = Readonly<{
  offerId: string;
  className?: string;
  /** Tamaño del icono en px (lucide size prop). */
  iconSize?: number;
  /** Superpuesto sobre la imagen (esquina superior derecha), como el botón de me gusta. */
  overlay?: boolean;
}>;

export function OfferSaveButton({
  offerId,
  className,
  iconSize = 18,
  overlay = false,
}: Props) {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const me = useAppStore((s) => s.me);
  const setSavedOffersFromIds = useAppStore((s) => s.setSavedOffersFromIds);
  const offer = useMarketStore((s) => s.offers[offerId]);
  const stores = useMarketStore((s) => s.stores);
  const saveMutation = useSaveOfferMutation();
  const unsaveMutation = useUnsaveOfferMutation();

  const isEmergentId = offerId.startsWith("emo_");
  /** Hoja de ruta publicada: guardar el id `emo_*` de la publicación, no el producto/servicio base del hilo. */
  let emoPublicationId: string | null = null;
  if (offer?.isEmergentRoutePublication) {
    if (offer.id.startsWith("emo_")) emoPublicationId = offer.id;
    else if (offerId.startsWith("emo_")) emoPublicationId = offerId;
  }
  const productIdForApi = emoPublicationId ?? offerId;
  const saved = useAppStore((s) => s.savedOffers[productIdForApi]);

  const store = offer ? stores[offer.storeId] : undefined;
  const isOwnOffer =
    !!offer &&
    !!store &&
    !!store.ownerUserId &&
    store.ownerUserId === me.id;

  const busy = saveMutation.isPending || unsaveMutation.isPending;

  if (isOwnOffer) return null;
  if (isEmergentId && !offer) return null;
  if (offer?.isEmergentRoutePublication && !emoPublicationId) {
    return null;
  }

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isSessionActive || me.id === "guest") {
      openAuthModal();
      return;
    }
    if (busy) return;
    try {
      const ids = saved
        ? await unsaveMutation.mutateAsync(productIdForApi)
        : await saveMutation.mutateAsync(productIdForApi);
      setSavedOffersFromIds(ids);
      toast.success(saved ? "Quitada de guardados" : "Guardada en tu perfil");
    } catch (err) {
      toastApiError(err);
    }
  }

  return (
    <button
      type="button"
      className={cn(
        overlay
          ? cn(
              storefrontOrganicOverlaySaveClass,
              saved && "vt-organic-overlay-btn--saved",
            )
          : "inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] p-2 text-[var(--text)] transition hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
        !overlay &&
          saved &&
          "border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_12%,var(--surface))] text-[var(--primary)]",
        className,
      )}
      onClick={(e) => void onClick(e)}
      disabled={busy}
      aria-busy={busy}
      aria-label={saved ? "Quitar de guardados" : "Guardar oferta"}
      title={saved ? "Quitar de guardados" : "Guardar"}
    >
      <Bookmark
        size={overlay ? 16 : iconSize}
        aria-hidden
        className={cn(saved && "fill-current")}
        strokeWidth={2}
      />
    </button>
  );
}
