import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { isStoreSurfacePath } from "@features/market/logic/store/storePath";
import {
  dismissBootSplash,
  scheduleBootSplashRemoval,
} from "@shared/lib/bootSplash";
import {
  applyStoreBootSplashToDom,
  enableStoreEntryBootSplashToDom,
  lookupStoreBootSplashByPathname,
} from "@shared/lib/storeBootSplash";

function isAdminPanelPath(pathname: string): boolean {
  return /\/panel(\/|$)/.test(pathname);
}

/**
 * Admin global: mantiene el splash de index.html hasta que React monta.
 * Rutas de tienda: aplican el logo cacheado (sección Tiendas) y dejan que
 * `StoreEntryLoadingScreen` retire el splash al montar.
 */
export function BootSplashRouteSync() {
  const { pathname } = useLocation();
  const isStorePath = isStoreSurfacePath(pathname);

  useLayoutEffect(() => {
    if (!isStorePath) return;
    const entry = lookupStoreBootSplashByPathname(pathname);
    if (entry?.avatarUrl) {
      applyStoreBootSplashToDom(entry);
    } else {
      enableStoreEntryBootSplashToDom();
    }
  }, [isStorePath, pathname]);

  useEffect(() => {
    if (isStorePath) return;
    if (isAdminPanelPath(pathname)) {
      scheduleBootSplashRemoval();
      return;
    }
    dismissBootSplash(true);
  }, [pathname, isStorePath]);

  return null;
}
