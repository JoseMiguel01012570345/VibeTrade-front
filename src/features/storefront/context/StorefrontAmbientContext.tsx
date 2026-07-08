import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { RgbTriplet } from "@shared/lib/image/extractDominantColor";
import {
  useStorefrontBannerAmbient,
  type StorefrontBannerAmbient,
} from "../hooks/useStorefrontBannerAmbient";

export type StorefrontAmbientContextValue = StorefrontBannerAmbient;

const StorefrontAmbientContext =
  createContext<StorefrontAmbientContextValue | null>(null);

export function StorefrontAmbientProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const ambient = useStorefrontBannerAmbient();
  return (
    <StorefrontAmbientContext.Provider value={ambient}>
      {children}
    </StorefrontAmbientContext.Provider>
  );
}

export function useStorefrontAmbient(): StorefrontAmbientContextValue {
  const ctx = useContext(StorefrontAmbientContext);
  if (!ctx) {
    return {
      hasPageAmbient: false,
      hasFooterAmbient: false,
      pageRgb: null,
      footerRgb: null,
    };
  }
  return ctx;
}

/** Solo variables CSS (sin fondo de página) para controles portaleados pequeños. */
export function storefrontAmbientCssVarsOnly(
  ambient: StorefrontAmbientContextValue,
): CSSProperties | undefined {
  if (!ambient.hasPageAmbient || !ambient.shellStyle) {
    return undefined;
  }
  const { background: _bg, ...vars } = ambient.shellStyle;
  return vars;
}

/** Props para portales (offcanvas, modales) que no heredan del shell. */
export function storefrontAmbientPortalProps(
  ambient: StorefrontAmbientContextValue,
  options?: Readonly<{ withPageBackground?: boolean }>,
): { className?: string; style?: CSSProperties } {
  if (!ambient.hasPageAmbient || !ambient.shellStyle) {
    return {};
  }
  const withPageBackground = options?.withPageBackground ?? true;
  return {
    className: "vt-storefront-ambient",
    style: withPageBackground
      ? ambient.shellStyle
      : storefrontAmbientCssVarsOnly(ambient),
  };
}

export type { RgbTriplet };
