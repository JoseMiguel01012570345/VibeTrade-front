import { useMemo, type CSSProperties } from "react";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useStoreBanners } from "@features/storefront/context/StoreBannersContext";
import {
  storefrontFooterBackground,
  storefrontShellStyle,
  type RgbTriplet,
} from "@shared/lib/image/extractDominantColor";
import { useDominantImageColor } from "@shared/lib/image/useDominantImageColor";

export type StorefrontBannerAmbient = {
  hasPageAmbient: boolean;
  hasFooterAmbient: boolean;
  pageRgb: RgbTriplet | null;
  footerRgb: RgbTriplet | null;
  shellStyle?: CSSProperties;
  footerStyle?: CSSProperties;
};

export function useStorefrontBannerAmbient(): StorefrontBannerAmbient {
  const colorScheme = useAppStore((s) => s.colorScheme);
  const { mainBanners, secondaryBanners } = useStoreBanners();

  const mainBannerUrl = mainBanners[0]?.mediaUrl?.trim() || null;
  const secondaryBannerUrl = secondaryBanners[0]?.mediaUrl?.trim() || null;

  const pageRgb = useDominantImageColor(
    mainBannerUrl,
    Boolean(mainBannerUrl),
    "storefront-surface",
  );
  const footerRgb = useDominantImageColor(
    secondaryBannerUrl,
    Boolean(secondaryBannerUrl),
    "storefront-surface",
  );

  return useMemo(() => {
    const hasPageAmbient = Boolean(mainBannerUrl);
    const hasFooterAmbient = Boolean(secondaryBannerUrl);

    return {
      hasPageAmbient,
      hasFooterAmbient,
      pageRgb: hasPageAmbient ? pageRgb : null,
      footerRgb: hasFooterAmbient ? footerRgb : null,
      shellStyle: hasPageAmbient
        ? storefrontShellStyle(pageRgb, colorScheme)
        : undefined,
      footerStyle: hasFooterAmbient
        ? ({
            "--storefront-footer-rgb": footerRgb,
            background: storefrontFooterBackground(footerRgb, colorScheme),
          } as CSSProperties)
        : undefined,
    };
  }, [
    colorScheme,
    footerRgb,
    mainBannerUrl,
    pageRgb,
    secondaryBannerUrl,
  ]);
}
