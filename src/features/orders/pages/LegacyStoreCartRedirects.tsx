import { Navigate } from "react-router-dom";
import { useCartStore } from "@features/orders/logic/cartStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import {
  storeCartHref,
  storeCheckoutHref,
} from "@features/market/logic/store/storePath";

/** Redirige rutas legadas `/cart` al carrito de la tienda del pedido activo. */
export function LegacyStoreCartRedirect() {
  const storeId = useCartStore(
    (s) => s.activeStoreId ?? s.items[0]?.storeId ?? "",
  );
  const store = useMarketStore((s) => (storeId ? s.stores[storeId] : undefined));
  return <Navigate to={storeCartHref(store)} replace />;
}

/** Redirige rutas legadas `/checkout` al checkout de la tienda del pedido activo. */
export function LegacyStoreCheckoutRedirect() {
  const storeId = useCartStore(
    (s) => s.activeStoreId ?? s.items[0]?.storeId ?? "",
  );
  const store = useMarketStore((s) => (storeId ? s.stores[storeId] : undefined));
  return <Navigate to={storeCheckoutHref(store)} replace />;
}
