import { getSessionToken } from "./sessionToken";

/**
 * En desarrollo (`import.meta.env.DEV`), las rutas que empiezan por `/api` usan URL relativa
 * para que el proxy de Vite (`vite.config.ts` → `localhost:5110`) reciba la petición.
 * Si `VITE_API_BASE_URL` apunta a `http://localhost:5110`, un `fetch` directo salta el proxy,
 * es cross-origin y puede quedar "pending" si el API no escucha o hay bloqueos.
 *
 * Para forzar la base absoluta en dev (p. ej. API en otro host), definí `VITE_FORCE_API_BASE=true`.
 */
export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const apiBase = (
    import.meta.env.VITE_API_BASE_URL as string | undefined
  )?.trim();
  const forceApiBase = import.meta.env.VITE_FORCE_API_BASE === "true";
  const useViteProxy =
    import.meta.env.DEV &&
    !forceApiBase &&
    input.startsWith("/api");

  let resolvedBase = "";
  if (!useViteProxy && apiBase) {
    resolvedBase = apiBase.replace(/\/+$/, "");
  }
  const base = resolvedBase;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  const headers = new Headers(init?.headers);
  headers.set("X-Timezone", timeZone);
  const token = getSessionToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Never set Content-Type for FormData: the runtime must send multipart boundary.
  const body = init?.body;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (body != null && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url =
    base && !/^https?:\/\//i.test(input)
      ? `${base}${input.startsWith("/") ? "" : "/"}${input}`
      : input;
  return fetch(url, { ...init, headers });
}
