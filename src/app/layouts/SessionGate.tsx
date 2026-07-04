import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { isStaffSession } from "@features/auth/logic/roles";
import { storePathFromName } from "@features/market/logic/store/storePath";

/** `path` coincide con `base` exacto o como prefijo de segmento (`base/...`). */
function isWithin(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function SessionGate() {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const me = useAppStore((s) => s.me);
  const { pathname } = useLocation();
  // El nombre de la tienda del staff (URL pública por nombre) puede no estar aún cargado.
  const staffStoreName = useMarketStore((s) =>
    me.staffStoreId ? s.stores[me.staffStoreId]?.name : undefined,
  );

  // Bloqueo total del personal (staff): solo el panel de su tienda (por id o por nombre).
  if (isSessionActive && isStaffSession(me) && me.staffStoreId) {
    const idBase = `/store/${me.staffStoreId}`;
    const nameBase = staffStoreName ? storePathFromName(staffStoreName) : null;
    const allowed =
      isWithin(pathname, idBase) ||
      (nameBase !== null && isWithin(pathname, nameBase));
    if (!allowed) {
      const target = nameBase
        ? `${nameBase}/panel/productos`
        : `${idBase}/panel/productos`;
      return <Navigate to={target} replace />;
    }
  }

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
