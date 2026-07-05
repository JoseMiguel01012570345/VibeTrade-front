import { useEffect, useState } from "react";
import {
  fetchMediaObjectUrl,
  getCachedMediaObjectUrl,
  isProtectedMediaUrl,
} from "@shared/services/media/mediaClient";
import { resolveStoreLoaderAvatar } from "@shared/lib/storeBootSplash";

function preloadImageUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

/**
 * true cuando no hay logo o la imagen del logo ya está lista para mostrar.
 * Mantiene el loader de entrada hasta que el avatar de la tienda puede pintarse.
 */
export function useStoreLogoLoaded(
  storeName: string | undefined,
  avatarUrl: string | null | undefined,
): boolean {
  const url = resolveStoreLoaderAvatar(storeName, avatarUrl);
  const [loaded, setLoaded] = useState(() => !url);

  useEffect(() => {
    if (!url) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
    let cancelled = false;

    void (async () => {
      try {
        if (isProtectedMediaUrl(url)) {
          const cached = getCachedMediaObjectUrl(url);
          const display = cached ?? (await fetchMediaObjectUrl(url));
          if (cancelled) return;
          await preloadImageUrl(display);
        } else {
          await preloadImageUrl(url);
        }
      } catch {
        /* fallback icono en el loader */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return loaded;
}
