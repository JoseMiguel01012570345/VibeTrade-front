import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Store } from "lucide-react";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { dismissBootSplash } from "@shared/lib/bootSplash";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import { cn } from "@shared/lib/cn";

type Props = Readonly<{
  storeName?: string;
  avatarUrl?: string | null;
  label?: string;
}>;

/**
 * Pantalla de entrada a la tienda (guest): imagen de la tienda subida en el perfil
 * (`avatarUrl`) centrada + spinner.
 */
export function StoreEntryLoadingScreen({
  storeName,
  avatarUrl,
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
      className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-white font-sans"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="flex w-full max-w-[min(92vw,32rem)] flex-col items-center gap-8 px-6 text-center">
        {avatarUrl ? (
          <ProtectedMediaImg
            src={avatarUrl}
            alt={storeName ? `Logo de ${storeName}` : "Logo de la tienda"}
            wrapperClassName="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.12)] ring-1 ring-[#E8ECF2] sm:h-36 sm:w-36"
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <span
            className={cn(
              "flex h-28 w-28 items-center justify-center rounded-2xl bg-[#E8F5E9] text-emerald-800",
              "shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-[#C8E6C9]/80 sm:h-36 sm:w-36",
            )}
            aria-hidden
          >
            <Store className="h-14 w-14 sm:h-16 sm:w-16" strokeWidth={1.5} />
          </span>
        )}
        {storeName ? (
          <p className="text-lg font-bold tracking-tight text-[#0F172A] sm:text-xl">
            {storeName}
          </p>
        ) : null}
        <CeSpinner size="xl" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );

  if (typeof document === "undefined") return content;

  return createPortal(content, document.body);
}
