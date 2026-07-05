import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { dismissBootSplash } from "@shared/lib/bootSplash";
import { CeSpinner } from "@shared/components/ui/CeSpinner";

type Props = Readonly<{
  label?: string;
}>;

/** Pantalla de entrada a la tienda: solo spinner centrado. */
export function StoreEntryLoadingScreen({
  label = "Cargando tienda",
}: Props) {
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    dismissBootSplash(true);
  }, []);

  const content = (
    <div
      className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-white/65 font-sans backdrop-blur-md dark:bg-[#0b1220]/55"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <CeSpinner size="xl" className="text-emerald-600 dark:text-emerald-400" />
      <span className="sr-only">{label}</span>
    </div>
  );

  if (typeof document === "undefined") return content;

  return createPortal(content, document.body);
}
