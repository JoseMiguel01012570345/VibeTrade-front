import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { isStoreSurfacePath } from "@features/market/logic/store/storePath";
import {
  dismissBootSplash,
  scheduleBootSplashRemoval,
} from "@shared/lib/bootSplash";
import { enableStoreEntryBootSplashToDom } from "@shared/lib/storeBootSplash";

/**
 * Admin global: mantiene el splash de index.html hasta que React monta.
 * Rutas de tienda (storefront, ficha, panel, carrito…): fondo difuminado + spinner
 * hasta que React toma el control y retira el splash.
 */
export function BootSplashRouteSync() {
  const { pathname } = useLocation();
  const isStorePath = isStoreSurfacePath(pathname);

  useLayoutEffect(() => {
    if (!isStorePath) return;
    enableStoreEntryBootSplashToDom();
  }, [isStorePath, pathname]);

  useEffect(() => {
    if (isStorePath) {
      scheduleBootSplashRemoval();
      return;
    }
    dismissBootSplash(true);
  }, [pathname, isStorePath]);

  return null;
}
