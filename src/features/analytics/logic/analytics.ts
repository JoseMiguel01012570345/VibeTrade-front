import { apiFetch } from "@shared/services/http/apiClient";

const SESSION_KEY_STORAGE = "vt.analytics.session";

function randomKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID().replace(/-/g, "");
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/** Clave anónima por pestaña del navegador (sessionStorage). */
export function getAnalyticsSessionKey(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY_STORAGE);
    if (existing && existing.length > 0) return existing;
    const key = randomKey().slice(0, 64);
    sessionStorage.setItem(SESSION_KEY_STORAGE, key);
    return key;
  } catch {
    return randomKey().slice(0, 64);
  }
}

function normalizePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function postAnalytics(path: string, body: object): Promise<void> {
  try {
    await apiFetch(path, {
      method: "POST",
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    /* fire-and-forget: la analítica nunca debe romper la navegación */
  }
}

/** Registra una vista de página (la IP la determina el servidor). */
export async function reportPageView(path: string): Promise<void> {
  await postAnalytics("/api/v1/analytics/page-view", {
    sessionKey: getAnalyticsSessionKey(),
    path: normalizePath(path),
  });
}

/** Registra una vista de ficha de producto. */
export async function reportProductView(productId: string): Promise<void> {
  const id = productId.trim();
  if (!id) return;
  await postAnalytics("/api/v1/analytics/product-view", {
    sessionKey: getAnalyticsSessionKey(),
    productId: id,
  });
}
