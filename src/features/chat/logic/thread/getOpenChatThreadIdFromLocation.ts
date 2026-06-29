/** Thread id del chat abierto en la ruta `/chat/:threadId` (o `null` en lista u otras rutas). */
export function getOpenChatThreadIdFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const pathname = window.location.pathname.replace(/\/+$/, "");
  const m = pathname.match(/^\/chat\/([^/]+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}
