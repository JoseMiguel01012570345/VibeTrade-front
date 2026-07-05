import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isStoreSurfacePath } from "@features/market/logic/store/storePath";
import {
  dismissBootSplash,
  scheduleBootSplashRemoval,
} from "@shared/lib/bootSplash";

function isAdminPanelPath(pathname: string): boolean {
  return /\/panel(\/|$)/.test(pathname);
}

/**
 * Admin global: mantiene el splash de index.html hasta que React monta.
 * Rutas de tienda (storefront o panel): quitan el splash de inmediato; la pantalla de
 * entrada usa la imagen de la tienda subida en el perfil (`avatarUrl`), no logo-oficial.
 */
export function BootSplashRouteSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (isStoreSurfacePath(pathname)) {
      dismissBootSplash(true);
      return;
    }
    if (isAdminPanelPath(pathname)) {
      scheduleBootSplashRemoval();
      return;
    }
    dismissBootSplash(true);
  }, [pathname]);

  return null;
}
