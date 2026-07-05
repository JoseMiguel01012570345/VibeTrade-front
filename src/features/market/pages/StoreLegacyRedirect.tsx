import { Navigate, useParams } from "react-router-dom";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStoreDetail } from "@features/market/hooks/useStoreDetail";
import { storePathFromName } from "@features/market/logic/store/storePath";

/**
 * Redirección legada por id (`/store/:storeId` y variantes) → URL pública por nombre
 * (`{base}/{nombre}`). Resuelve el nombre desde el estado o, si hace falta, del backend
 * por id. `suffix` conserva el subpath (p. ej. `/mapa`).
 */
export function StoreLegacyRedirect({
  suffix = "",
}: Readonly<{ suffix?: string }>) {
  const { storeId } = useParams();
  const me = useAppStore((s) => s.me);
  const loadedName = useMarketStore((s) =>
    storeId ? s.stores[storeId]?.name : undefined,
  );
  const query = useStoreDetail(loadedName ? undefined : storeId, me.id);
  const name = loadedName ?? query.data?.store.name;

  if (!storeId) return <Navigate to="/home" replace />;
  if (name) return <Navigate to={`${storePathFromName(name)}${suffix}`} replace />;
  if (query.isError) return <Navigate to="/home" replace />;
  return (
    <div className="store-front-surface min-h-full bg-[var(--bg)]">
      <div className="mx-auto max-w-[1140px] px-4 py-10 text-sm text-slate-500">
        Cargando tienda…
      </div>
    </div>
  );
}
