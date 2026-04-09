import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "../lib/cn";

const IDLE_MS = 1000;
const TOP_THRESHOLD = 48;
const DOWN_DELTA = 4;

/**
 * Botón fijo: se muestra al desplazarse hacia abajo y se oculta 1s después del último evento de scroll.
 */
export function ScrollToTopFab({
  className,
}: Readonly<{ className?: string }>) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastY = window.scrollY;

    const clearIdle = () => {
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const scheduleHide = () => {
      clearIdle();
      idleTimer = setTimeout(() => {
        setVisible(false);
        idleTimer = null;
      }, IDLE_MS);
    };

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;

      if (y < TOP_THRESHOLD) {
        setVisible(false);
        clearIdle();
        return;
      }

      if (dy > DOWN_DELTA) {
        setVisible(true);
      }

      scheduleHide();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearIdle();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className={cn(
        "fixed right-4 z-[65] inline-flex max-w-[min(calc(100vw-2rem),280px)] items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-xs font-black shadow-[0_12px_40px_rgba(2,6,23,0.2)] transition hover:border-[color-mix(in_oklab,var(--primary)_40%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] min-[480px]:right-8 min-[480px]:px-4 min-[480px]:text-sm",
        "bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]",
        className,
      )}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      aria-label="Subir al principio"
    >
      <ChevronUp size={20} className="shrink-0 text-[var(--primary)]" aria-hidden />
      <span className="truncate">Subir al principio</span>
    </button>
  );
}
