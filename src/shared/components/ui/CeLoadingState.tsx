import { useEffect } from "react";
import { createPortal } from "react-dom";
import { dismissBootSplash } from "@shared/lib/bootSplash";
import { cn } from "@shared/lib/cn";
import { CeSpinner, type CeSpinnerSize } from "./CeSpinner";

export type CeLoadingStateProps = {
  className?: string;
  spinnerSize?: CeSpinnerSize;
  /** Solo para lectores de pantalla; no se muestra texto visible. */
  label?: string;
};

export function CeLoadingState({
  className,
  spinnerSize = "xl",
  label = "Cargando",
}: CeLoadingStateProps) {
  useEffect(() => {
    dismissBootSplash(true);
  }, []);

  const overlay = (
    <div
      className={cn(
        "fixed inset-0 z-[100000] flex items-center justify-center bg-white/65 backdrop-blur-md",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <CeSpinner size={spinnerSize} />
      <span className="sr-only">{label}</span>
    </div>
  );

  if (typeof document === "undefined") return overlay;

  return createPortal(overlay, document.body);
}
