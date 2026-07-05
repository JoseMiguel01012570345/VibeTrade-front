import { Heart } from "lucide-react";
import { cn } from "@shared/lib/cn";

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
    "pointer-events-auto absolute bottom-2 right-2 z-[2] inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/80 bg-white/95 px-2 py-1 text-xs font-extrabold text-slate-700 shadow-md backdrop-blur-sm transition hover:bg-white",
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
        className={cn(liked && "fill-rose-500 text-rose-500")}
        aria-hidden
      />
      <span className="tabular-nums">{likeCount}</span>
    </button>
  );
}
