import { useAppStore } from "../../app/store/useAppStore";
import { getSessionToken } from "./sessionToken";

function requestPathname(input: string): string {
  const withoutQuery = input.split("?")[0] ?? input;
  if (/^https?:\/\//i.test(withoutQuery)) {
    try {
      return new URL(withoutQuery).pathname;
    } catch {
      return withoutQuery;
    }
  }
  return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
}

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

  const headers = new Headers(init?.headers);
  const token = getSessionToken();
  const path = requestPathname(input);
  const method = (init?.method ?? "GET").toUpperCase();
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  /**
   * Me gusta y comentarios exigen Bearer: si el token ya está guardado y la sesión
   * aún no marcó `isSessionActive` (hidratar / race), el POST iba sin Authorization → 401.
   */
  const attachBearerForPendingSession =
    !!token &&
    isMutating &&
    (/^\/api\/v1\/market\/offers\/[^/]+\/like$/.test(path) ||
      /^\/api\/v1\/market\/offers\/[^/]+\/qa\/[^/]+\/like$/.test(path) ||
      path === "/api/v1/market/inquiries" ||
      path === "/api/v1/market/workspace/inquiries" ||
      path === "/api/v1/routing/leg-distances" ||
      path === "/api/v1/me/trust-adjust" ||
      /^\/api\/v1\/stores\/[^/]+\/trust-adjust$/.test(path));
  /**
   * Invitado: token residual sin `isSessionActive` no debe ir a bootstrap/recomendaciones guest.
   * Excepción: restaurar o cerrar sesión envían Bearer aunque el store aún no marque activa;
   * además, mutaciones de engagement/comentarios (arriba) con token anexan Bearer aunque la sesión
   * aún se esté activando.
   */
  const attachBearer =
    !!token &&
    (useAppStore.getState().isSessionActive ||
      path === "/api/v1/auth/session" ||
      path === "/api/v1/auth/logout" ||
      attachBearerForPendingSession);
  if (attachBearer) {
    headers.set("Authorization", `Bearer ${token}`);
  }
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
