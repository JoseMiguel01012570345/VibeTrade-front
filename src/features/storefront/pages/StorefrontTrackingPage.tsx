import { useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStorePageDetail } from "@features/market/hooks/useStorePageDetail";
import { useStoreIdFromName } from "@features/market/hooks/useStoreByName";
import { isReservedStoreName } from "@features/market/logic/store/storePath";
import { TrackShipmentContent } from "@features/orders";
import { StorefrontChrome } from "../components/StorefrontChrome";
import { StorefrontLoadingState } from "../components/StorefrontPageStates";

/**
 * Buscador de rastreo dentro de una tienda (`{base}/{nombre}/rastreo`). Igual que el rastreo
 * global pero conservando el cintillo de la tienda (cabecera + pie de `StorefrontChrome`), que
 * es como se llega desde el enlace Â«Rastrea tu envÃ­oÂ» del header. Si la tienda no se puede
 * resolver, cae al buscador simple (sin cintillo).
 */
export function StorefrontTrackingPage() {
  const { storeName } = useParams();
  const me = useAppStore((s) => s.me);
  const { storeId, resolving, notFound } = useStoreIdFromName(storeName, me.id);
  const store = useMarketStore((s) => (storeId ? s.stores[storeId] : undefined));
  const [loadNonce] = useState(0);
  const { detailStatus } = useStorePageDetail(storeId, me.id, loadNonce);

  // Un segmento reservado no es una tienda: al buscador global.
  if (!store && isReservedStoreName(storeName ?? "")) {
    return <Navigate to="/rastreo" replace />;
  }

  const surface =
    "store-front-surface min-h-full bg-[#f7f3ef] text-slate-900";

  if (!notFound && (resolving || detailStatus === "loading")) {
    return <StorefrontLoadingState />;
  }

  // Sin tienda resoluble: buscador de rastreo sin cintillo (mismo contenido).
  if (!store) {
    return (
      <div className={`${surface} pb-[96px] sm:pb-[112px]`}>
        <TrackShipmentContent />
      </div>
    );
  }

  return (
    <StorefrontChrome store={store}>
      <TrackShipmentContent />
    </StorefrontChrome>
  );
}

