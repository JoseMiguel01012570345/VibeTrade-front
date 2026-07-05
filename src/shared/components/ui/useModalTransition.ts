import { useEffect, useState } from "react";

export const MODAL_TRANSITION_MS = 300;

/** Mantiene el modal montado durante la animación de salida. */
export function useModalTransition(
  open: boolean,
  transitionMs = MODAL_TRANSITION_MS,
) {
  const [displayed, setDisplayed] = useState(open);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (open) {
      setDisplayed(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimateIn(true));
      });
      return () => cancelAnimationFrame(frame);
    }
    setAnimateIn(false);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open && displayed) {
      const id = globalThis.setTimeout(() => setDisplayed(false), transitionMs);
      return () => globalThis.clearTimeout(id);
    }
    return undefined;
  }, [open, displayed, transitionMs]);

  return { displayed, animateIn, transitionMs };
}
