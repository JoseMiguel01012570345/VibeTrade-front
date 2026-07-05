import { Outlet, useLocation } from "react-router-dom";

/** Contenedor del `<Outlet />` con fade-in al cambiar de ruta (shell intacto). */
export function CeAnimatedOutlet() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}${location.hash}`;

  return (
    <div
      key={routeKey}
      className="ce-route-view ce-route-view-enter flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <Outlet />
    </div>
  );
}
