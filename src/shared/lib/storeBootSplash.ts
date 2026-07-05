import { normStoreName } from "@features/market/logic/store/marketSliceHelpers";
import { isStoreSurfacePath } from "@features/market/logic/store/storePath";
import { isProtectedMediaUrl } from "@shared/services/media/mediaClient";

const STORAGE_KEY = "vt-store-boot-splash-v1";

type StoreBootSplashEntry = {
  name: string;
  avatarUrl: string;
};

function readAll(): Record<string, StoreBootSplashEntry> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StoreBootSplashEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, StoreBootSplashEntry>): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* quota / private mode */
  }
}

/** Guarda el logo de la tienda (sección Tiendas del perfil) para el loader de entrada. */
export function rememberStoreBootSplash(
  storeName: string,
  avatarUrl: string | null | undefined,
): void {
  const name = storeName.trim();
  const url = avatarUrl?.trim();
  if (!name || !url) return;
  const key = normStoreName(name);
  const all = readAll();
  all[key] = { name, avatarUrl: url };
  writeAll(all);
}

export function lookupStoreBootSplashByName(
  storeName: string,
): StoreBootSplashEntry | null {
  const key = normStoreName(storeName);
  if (!key) return null;
  return readAll()[key] ?? null;
}

export function storeNameFromPathname(pathname: string): string {
  if (pathname.startsWith("/store/") || pathname.startsWith("/offer/")) {
    return "";
  }
  const seg = pathname.split("/")[1] ?? "";
  if (!seg) return "";
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

export function lookupStoreBootSplashByPathname(
  pathname: string,
): StoreBootSplashEntry | null {
  if (!isStoreSurfacePath(pathname)) return null;
  const name = storeNameFromPathname(pathname);
  return name ? lookupStoreBootSplashByName(name) : null;
}

/** Logo del loader: API/estado local, con fallback al cache de la sección Tiendas. */
export function resolveStoreLoaderAvatar(
  storeName: string | undefined,
  avatarUrl: string | null | undefined,
): string | undefined {
  const direct = avatarUrl?.trim();
  if (direct) return direct;
  const name = storeName?.trim();
  if (!name) return undefined;
  return lookupStoreBootSplashByName(name)?.avatarUrl;
}

/** Modo entrada tienda: fondo difuminado + spinner (sin logo oficial). */
export function enableStoreEntryBootSplashToDom(): void {
  if (typeof document === "undefined") return;
  const splash = document.getElementById("boot-splash");
  if (!splash) return;
  splash.classList.add("boot-splash--store");
  splash.setAttribute("aria-label", "Cargando tienda");
}

/**
 * Actualiza el splash estático de index.html (antes de React) con el logo cacheado.
 * URLs protegidas (`/api/v1/media/…`) no se aplican aquí; React las resuelve con Bearer.
 */
export function applyStoreBootSplashToDom(
  entry: StoreBootSplashEntry | null,
): void {
  if (typeof document === "undefined") return;
  const splash = document.getElementById("boot-splash");
  if (!splash) return;

  if (!entry?.avatarUrl || isProtectedMediaUrl(entry.avatarUrl)) {
    enableStoreEntryBootSplashToDom();
    return;
  }

  const img = splash.querySelector("img.boot-logo, img.boot-store-logo");
  if (!(img instanceof HTMLImageElement)) {
    enableStoreEntryBootSplashToDom();
    return;
  }
  splash.classList.remove("boot-splash--store");
  img.style.display = "block";
  img.src = entry.avatarUrl;
  img.alt = entry.name ? `Logo de ${entry.name}` : "Logo de la tienda";
  img.classList.remove("boot-logo");
  img.classList.add("boot-store-logo");
  img.removeAttribute("width");
  img.removeAttribute("height");
}
