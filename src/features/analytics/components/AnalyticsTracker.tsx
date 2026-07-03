import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { reportPageView } from "../logic/analytics";

/** Emite una vista de página por cada cambio de ruta (montado en el shell). */
export function AnalyticsTracker() {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname + location.search;
    if (lastPath.current === path) return;
    lastPath.current = path;
    void reportPageView(location.pathname);
  }, [location.pathname, location.search]);

  return null;
}
