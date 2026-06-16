/** Vite dev server (UI + optional /api proxy). */
export function getE2EAppBaseUrl(): string {
  return (process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173").replace(
    /\/$/,
    "",
  );
}

/** Direct backend origin for Node-side E2E helpers (does not require Vite). */
export function getE2EApiBaseUrl(): string {
  const direct = process.env.PLAYWRIGHT_E2E_API_URL?.trim();
  if (direct) return direct.replace(/\/$/, "");
  return "http://127.0.0.1:5110";
}

export function e2eApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getE2EApiBaseUrl()}${normalized}`;
}
