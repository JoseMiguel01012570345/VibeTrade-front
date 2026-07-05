import type { SVGAttributes } from "react";
import { cn } from "@shared/lib/cn";
import "./ceSpinner.css";

export type CeSpinnerSize = "sm" | "md" | "lg" | "xl";

const sizeClass: Record<CeSpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
  xl: "h-14 w-14",
};

export type CeSpinnerProps = SVGAttributes<SVGSVGElement> & {
  size?: CeSpinnerSize;
};

export function CeSpinner({
  className,
  size = "md",
  "aria-label": ariaLabel = "Cargando",
  ...props
}: CeSpinnerProps) {
  return (
    <svg
      className={cn(
        "ce-spinner shrink-0 text-primary-600 dark:text-primary-400",
        sizeClass[size],
        className,
      )}
      viewBox="0 0 100 100"
      role="status"
      aria-label={ariaLabel}
      {...props}
    >
      <circle cx="50" cy="50" r="20" />
    </svg>
  );
}
