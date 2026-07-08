import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type SyntheticEvent,
} from "react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { offerCardAmbientClass } from "@shared/styles/organicCardStyles";
import {
  extractDominantRgbFromImageElement,
  offerCardAmbientBackground,
} from "./extractDominantColor";
import { useDominantImageColor } from "./useDominantImageColor";
import type { RgbTriplet } from "./extractDominantColor";

export function useOfferCardAmbientStyle(
  imageUrl: string | null,
  enabled: boolean,
): {
  className?: string;
  style?: CSSProperties;
  onImageLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
} {
  const colorScheme = useAppStore((s) => s.colorScheme);
  const urlRgb = useDominantImageColor(imageUrl, enabled);
  const [elementRgb, setElementRgb] = useState<RgbTriplet | null>(null);

  useEffect(() => {
    setElementRgb(null);
  }, [imageUrl]);

  const onImageLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      if (!enabled) return;
      const next = extractDominantRgbFromImageElement(
        event.currentTarget,
        colorScheme,
      );
      setElementRgb((prev) => (prev === next ? prev : next));
    },
    [colorScheme, enabled],
  );

  const rgb = elementRgb ?? urlRgb;

  const style = useMemo((): CSSProperties | undefined => {
    if (!enabled) return undefined;
    return {
      "--offer-card-rgb": rgb,
      background: offerCardAmbientBackground(rgb, colorScheme),
    } as CSSProperties;
  }, [colorScheme, enabled, rgb]);

  if (!enabled) return {};

  return {
    className: offerCardAmbientClass,
    style,
    onImageLoad,
  };
}
