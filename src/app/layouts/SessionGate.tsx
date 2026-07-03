import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppStore } from "@features/auth/logic/useAppStore";

export function SessionGate() {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const { pathname } = useLocation();

  if (!isSessionActive) {
    // `/cart` queda accesible para invitados; el resto de flujos con sesión se bloquean.
    const blocked =
      pathname.startsWith("/chat") ||
      pathname.startsWith("/reels") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/notifications") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/mis-compras") ||
      pathname.startsWith("/afiliado") ||
      pathname.startsWith("/finanzas") ||
      pathname.startsWith("/almacen") ||
      pathname.startsWith("/mensualidad") ||
      pathname.startsWith("/estadisticas") ||
      pathname.startsWith("/admin");
    if (blocked) return <Navigate to="/home" replace />;
  }
  if (isSessionActive && pathname.startsWith("/onboarding")) {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}
