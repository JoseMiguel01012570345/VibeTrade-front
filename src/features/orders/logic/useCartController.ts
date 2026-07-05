import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { cartSubtotal, useCartStore, type CartItem } from "./cartStore";
import {
  buildShareCartPath,
  buildShareCartUrl,
  cartMatchesShareParam,
  decodeShareCartParam,
  importSharedCartItems,
} from "./shareCart";
import { getSessionToken } from "@shared/services/http/sessionToken";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStoreDetail } from "@features/market/hooks/useStoreDetail";
import { useStoreIdFromName } from "@features/market/hooks/useStoreByName";
import {
  storeCartHref,
  storeCheckoutHref,
  storeHref,
} from "@features/market/logic/store/storePath";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";
import type { StoreProduct, StoreService } from "@features/market/logic/storeCatalogTypes";

export type DetailedLine = CartItem & {
  product: StoreProduct | null;
  service: StoreService | null;
};

/** Orquesta el carrito: resuelve la tienda, importa/sincroniza el enlace compartido
 *  y expone acciones (cantidad, quitar, checkout, compartir) para la página. */
export function useCartController() {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeName } = useParams();
  const [searchParams] = useSearchParams();
  const shareParam = searchParams.get("share");
  const activeStoreId = useCartStore((s) => s.activeStoreId);
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const replaceCart = useCartStore((s) => s.replaceCart);
  const me = useAppStore((s) => s.me);
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const importRunIdRef = useRef(0);
  const appliedShareRef = useRef<string | null>(null);
  const [importingShare, setImportingShare] = useState(false);
  const [sharingCart, setSharingCart] = useState(false);

  // El carrito es de una sola tienda: normalmente la del primer artículo, pero si se
  // llega con carrito vacío a `/{nombre}/cart` resolvemos la tienda por el nombre.
  const nameResolution = useStoreIdFromName(storeName, me.id);
  const storeId = activeStoreId || items[0]?.storeId || nameResolution.storeId || "";
  const storeFromState = useMarketStore((s) =>
    storeId ? s.stores[storeId] : undefined,
  );
  const catalogFromState = useMarketStore((s) =>
    storeId ? s.storeCatalogs[storeId] : undefined,
  );
  // Carga la tienda del carrito (marca para el header + catálogo para sugeridos)
  // si aún no está en memoria; queda cacheada por react-query.
  const detailQuery = useStoreDetail(storeId || undefined, me.id);

  const store: StoreBadge | undefined = storeFromState ?? detailQuery.data?.store;

  // Base de la ruta del carrito/checkout dentro de la tienda: `{base}/{nombre}/cart`.
  const storeForLinks: Pick<StoreBadge, "id" | "name"> | undefined = storeName
    ? { id: store?.id ?? "", name: storeName }
    : store;
  const cartPath = storeCartHref(storeForLinks);
  const checkoutPath = storeCheckoutHref(storeForLinks);
  const detailProducts = detailQuery.data?.catalog.products;
  const detailServices = detailQuery.data?.catalog.services;
  const catalogProducts = useMemo(
    () => catalogFromState?.products ?? detailProducts ?? [],
    [catalogFromState, detailProducts],
  );
  const catalogServices = useMemo(
    () => catalogFromState?.services ?? detailServices ?? [],
    [catalogFromState, detailServices],
  );

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const currency = items[0]?.currencyCode ?? "";
  const totalUnits = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const shareCartUrl = useMemo(
    () =>
      items.length
        ? buildShareCartUrl(
            cartPath,
            storeId,
            items
              .filter((i) => i.kind === "product" && i.productId)
              .map((i) => ({
                productId: i.productId!,
                quantity: i.quantity,
              })),
          )
        : "",
    [items, storeId, cartPath],
  );

  // Importa el carrito compartido cuando la URL trae `?share=` (réplica de la
  // referencia): decodifica, resuelve los productos del catálogo y reemplaza.
  useEffect(() => {
    const raw = shareParam?.trim() ?? "";
    if (!raw) {
      appliedShareRef.current = null;
      setImportingShare(false);
      return;
    }
    if (appliedShareRef.current === raw) {
      setImportingShare(false);
      return;
    }
    const decoded = decodeShareCartParam(raw);
    if (!decoded.items.length) {
      toast.error("Enlace de carrito no válido.");
      setImportingShare(false);
      return;
    }
    if (cartMatchesShareParam(items, raw)) {
      appliedShareRef.current = raw;
      setImportingShare(false);
      return;
    }

    const runId = ++importRunIdRef.current;
    setImportingShare(true);
    importSharedCartItems(decoded.storeId, decoded.items, me.id)
      .then((result) => {
        if (runId !== importRunIdRef.current) return;
        if (!result.lines.length) {
          toast.error("No se pudo cargar ningún producto del enlace.");
          return;
        }
        replaceCart(result.lines);
        appliedShareRef.current = raw;
        if (result.skipped.length) {
          toast(
            `${result.skipped.length} producto(s) no se incluyeron (agotados o no disponibles).`,
          );
        } else {
          toast.success("Carrito importado correctamente.");
        }
      })
      .catch(() => {
        if (runId !== importRunIdRef.current) return;
        toast.error("No se pudo importar el carrito compartido.");
      })
      .finally(() => {
        if (runId !== importRunIdRef.current) return;
        setImportingShare(false);
      });
  }, [shareParam, items, me.id, replaceCart]);

  // Mantiene la URL sincronizada con el carrito, para que la barra de direcciones
  // sea siempre un enlace compartible (como en la referencia).
  useEffect(() => {
    if (importingShare) return;
    const targetPath = items.length
      ? buildShareCartPath(
          cartPath,
          storeId,
          items
            .filter((i) => i.kind === "product" && i.productId)
            .map((i) => ({
              productId: i.productId!,
              quantity: i.quantity,
            })),
        )
      : cartPath;
    const currentPath = `${location.pathname}${location.search}`;
    if (currentPath === targetPath) return;
    navigate(targetPath, { replace: true });
  }, [
    items,
    storeId,
    cartPath,
    importingShare,
    location.pathname,
    location.search,
    navigate,
  ]);

  async function copyShareCartLink() {
    // Compartir requiere sesión: si el usuario es invitado, abrimos el modal de
    // iniciar sesión / registrar cuenta en lugar de copiar el enlace.
    const sessionReady = isSessionActive || !!getSessionToken();
    if (!sessionReady) {
      openAuthModal();
      return;
    }
    const url =
      shareCartUrl ||
      (typeof globalThis === "undefined" ? "" : globalThis.location.href);
    if (!url || sharingCart) return;
    setSharingCart(true);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado al portapapeles.");
    } catch {
      toast.error("No se pudo copiar el enlace.");
    } finally {
      setSharingCart(false);
    }
  }

  const detailedLines = useMemo<DetailedLine[]>(
    () =>
      items.map((line) => ({
        ...line,
        product:
          line.kind === "product"
            ? (catalogProducts.find((p) => p.id === line.productId) ?? null)
            : null,
        service:
          line.kind === "service"
            ? (catalogServices.find((s) => s.id === line.serviceId) ?? null)
            : null,
      })),
    [items, catalogProducts, catalogServices],
  );

  const suggestions = useMemo(() => {
    const inCart = new Set(
      items.map((i) =>
        i.kind === "service" ? `svc:${i.serviceId}` : `prd:${i.productId}`,
      ),
    );
    return catalogProducts
      .filter(
        (p) => p.published && !inCart.has(`prd:${p.id}`),
      )
      .slice(0, 4);
  }, [catalogProducts, items]);

  const keepShoppingHref = store ? storeHref(store) : "/home";

  return {
    store,
    storeForLinks,
    keepShoppingHref,
    importingShare,
    isEmpty: items.length === 0,
    detailedLines,
    suggestions,
    subtotal,
    currency,
    totalUnits,
    sharingCart,
    shareDisabled: sharingCart || !shareCartUrl,
    setQuantity,
    removeItem,
    onCheckout: () => navigate(checkoutPath),
    onShare: () => void copyShareCartLink(),
  };
}
