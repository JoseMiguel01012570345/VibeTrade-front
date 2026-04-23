import { useState } from "react";
import { Bookmark } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../../lib/cn";
import { useAppStore } from "../../app/store/useAppStore";
import { useMarketStore } from "../../app/store/useMarketStore";
import {
  deleteSavedOffer,
  postSavedOffer,
} from "../../utils/savedOffers/savedOffersApi";
import { errorToUserMessage } from "../../utils/http/apiErrorMessage";

type Props = Readonly<{
  offerId: string;
  className?: string;
  /** Tamaño del icono en px (lucide size prop). */
  iconSize?: number;
}>;

export function OfferSaveButton({
  offerId,
  className,
  iconSize = 18,
}: Props) {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const me = useAppStore((s) => s.me);
  const setSavedOffersFromIds = useAppStore((s) => s.setSavedOffersFromIds);
  const offer = useMarketStore((s) => s.offers[offerId]);
  const stores = useMarketStore((s) => s.stores);
  const [busy, setBusy] = useState(false);

  const isEmergentId = offerId.startsWith("emo_");
  /** Publicación `emo_…` se guarda como producto de catálogo (`emergentBaseOfferId`), no con el id emergente. */
  const productIdForApi =
    offer?.isEmergentRoutePublication && offer.emergentBaseOfferId?.trim() ?
      offer.emergentBaseOfferId.trim()
    : offerId;
  const saved = useAppStore((s) => s.savedOffers[productIdForApi]);

  const store = offer ? stores[offer.storeId] : undefined;
  const isOwnOffer =
    !!offer &&
    !!store &&
    !!store.ownerUserId &&
    store.ownerUserId === me.id;

  if (isOwnOffer) return null;
  if (isEmergentId && !offer) return null;
  if (offer?.isEmergentRoutePublication && !offer.emergentBaseOfferId?.trim()) {
    return null;
  }

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isSessionActive || me.id === "guest") {
      toast.error("Iniciá sesión para guardar ofertas.");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const ids = saved
        ? await deleteSavedOffer(productIdForApi)
        : await postSavedOffer(productIdForApi);
      setSavedOffersFromIds(ids);
      toast.success(saved ? "Quitada de guardados" : "Guardada en tu perfil");
    } catch (err) {
      toast.error(errorToUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] p-2 text-[var(--text)] transition hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
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
        size={iconSize}
        aria-hidden
        className={cn(saved && "fill-current")}
        strokeWidth={2}
      />
    </button>
  );
}
