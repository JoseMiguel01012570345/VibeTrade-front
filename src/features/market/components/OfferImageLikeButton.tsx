import { Heart } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { storefrontOrganicOverlayLikeClass } from "@shared/styles/organicCardStyles";

type Props = Readonly<{
  liked: boolean;
  likeCount: number;
  canLike: boolean;
  onToggle: () => void;
  className?: string;
  iconSize?: number;
}>;

/** Me gusta superpuesto sobre la imagen de una tarjeta u oferta (esquina inferior derecha). */
export function OfferImageLikeButton({
  liked,
  likeCount,
  canLike,
  onToggle,
  className,
  iconSize = 16,
}: Props) {
  const shellClass = cn(
    storefrontOrganicOverlayLikeClass,
    liked && "vt-organic-overlay-btn--liked",
    className,
  );

  const likeLabel = canLike
    ? liked
      ? "Quitar me gusta"
      : "Me gusta"
    : "Inicia sesión para dar me gusta";

  return (
    <button
      type="button"
      className={shellClass}
      title={likeLabel}
      aria-label={likeLabel}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
    >
      <Heart
        size={iconSize}
        className={cn(
          liked && "vt-organic-overlay-btn__heart--on fill-current",
        )}
        aria-hidden
      />
      <span className="tabular-nums">{likeCount}</span>
    </button>
  );
}
