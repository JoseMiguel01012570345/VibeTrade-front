import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { isProtectedMediaUrl } from "@shared/services/media/mediaClient";
import {
  extractDominantRgbFromImageUrl,
  fallbackRgbForPurpose,
  type DominantColorPurpose,
  type RgbTriplet,
} from "./extractDominantColor";

const PROTECTED_RETRY_MS = [400, 1200, 2500];

export function useDominantImageColor(
  imageUrl: string | null,
  enabled = true,
  purpose: DominantColorPurpose = "offer-card",
): RgbTriplet {
  const colorScheme = useAppStore((s) => s.colorScheme);
  const fallback = useMemo(
    () => fallbackRgbForPurpose(colorScheme, purpose),
    [colorScheme, purpose],
  );
  const [rgb, setRgb] = useState<RgbTriplet>(fallback);

  useEffect(() => {
    if (!enabled) {
      setRgb((prev) => (prev === fallback ? prev : fallback));
      return;
    }
    setRgb((prev) => (prev === fallback ? prev : fallback));
  }, [enabled, fallback]);

  useEffect(() => {
    if (!enabled || !imageUrl) return;

    let cancelled = false;
    const timers: number[] = [];

    async function extractOnce(): Promise<RgbTriplet> {
      return extractDominantRgbFromImageUrl(imageUrl!, colorScheme, purpose);
    }

    void (async () => {
      const first = await extractOnce();
      if (cancelled) return;
      setRgb((prev) => (prev === first ? prev : first));

      if (!isProtectedMediaUrl(imageUrl) || first !== fallback) return;

      for (const delay of PROTECTED_RETRY_MS) {
        await new Promise<void>((resolve) => {
          timers.push(window.setTimeout(resolve, delay));
        });
        if (cancelled) return;
        const retry = await extractOnce();
        if (cancelled) return;
        setRgb((prev) => (prev === retry ? prev : retry));
        if (retry !== fallback) break;
      }
    })();

    return () => {
      cancelled = true;
      for (const id of timers) window.clearTimeout(id);
    };
  }, [enabled, imageUrl, colorScheme, fallback, purpose]);

  if (!enabled) return fallback;
  return imageUrl ? rgb : fallback;
}
