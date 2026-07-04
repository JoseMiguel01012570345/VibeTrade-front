import type { ButtonHTMLAttributes } from "react";

/**
 * Flecha de desplazamiento para carruseles horizontales. Copiada tal cual de la
 * app de referencia (frontend-guest): `src/components/ScrollArrowButton.tsx`.
 */
type Direction = "left" | "right";

type ScrollArrowButtonProps = {
  direction: Direction;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label">;

const DIRECTION_META: Record<
  Direction,
  { label: string; positionClass: string; path: string }
> = {
  left: {
    label: "Desplazar a la izquierda",
    positionClass: "left-1",
    path: "M12.707 4.293a1 1 0 010 1.414L8.414 10l4.293 4.293a1 1 0 11-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z",
  },
  right: {
    label: "Desplazar a la derecha",
    positionClass: "right-1",
    path: "M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z",
  },
};

const BASE_CLASS =
  "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#e2dcd4] bg-white text-emerald-700 shadow-[0_8px_20px_rgba(15,107,79,0.15)] transition hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:flex";

export function ScrollArrowButton({
  direction,
  className,
  type = "button",
  ...rest
}: Readonly<ScrollArrowButtonProps>) {
  const meta = DIRECTION_META[direction];
  const ariaLabel =
    (rest as { "aria-label"?: string })["aria-label"] ?? meta.label;
  const merged = [BASE_CLASS, meta.positionClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button {...rest} type={type} aria-label={ariaLabel} className={merged}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
        className="h-5 w-5"
      >
        <path fillRule="evenodd" d={meta.path} clipRule="evenodd" />
      </svg>
    </button>
  );
}
