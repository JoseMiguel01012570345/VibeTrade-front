import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { cartHasProducts, cartSubtotal, useCartStore } from "./cartStore";
import { useCheckoutPreview, useCreateOrder } from "../hooks/useOrders";
import type { OrderDeliveryMode } from "../Dtos/orders";
import {
  EMPTY_DELIVERY,
  buildOrderRequest,
  isDeliveryComplete,
  type DeliveryFormData,
} from "./checkoutForm";
import { errorToUserMessage } from "@shared/services/http/apiErrorMessage";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { useMarketStore } from "@features/market/logic/store/useMarketStore";
import { useStoreDetail } from "@features/market/hooks/useStoreDetail";
import { useStoreIdFromName } from "@features/market/hooks/useStoreByName";
import { storeHref } from "@features/market/logic/store/storePath";
import type { StoreBadge } from "@features/market/logic/store/marketStoreTypes";

/** Orquesta el checkout: resuelve la tienda, calcula el envío (debounce) y crea el
 *  pedido, exponiendo estado y acciones para que la página solo componga la vista. */
export function useCheckout() {
  const navigate = useNavigate();
  const { storeName } = useParams();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const me = useAppStore((s) => s.me);

  const [mode, setMode] = useState<OrderDeliveryMode>("shipping");
  const [delivery, setDelivery] = useState<DeliveryFormData>(EMPTY_DELIVERY);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);

  const {
    mutate: runPreview,
    reset: resetPreview,
    data: preview,
    isPending: previewLoading,
    error: previewErrorRaw,
  } = useCheckoutPreview();
  const create = useCreateOrder();

  // Tienda del carrito (o de la URL `/{nombre}/checkout`) para el chrome + enlaces.
  const nameResolution = useStoreIdFromName(storeName, me.id);
  const storeId = items[0]?.storeId || nameResolution.storeId || "";
  const storeFromState = useMarketStore((s) =>
    storeId ? s.stores[storeId] : undefined,
  );
  const detailQuery = useStoreDetail(storeId || undefined, me.id);
  const store: StoreBadge | undefined = storeFromState ?? detailQuery.data?.store;
  const backHref = store ? storeHref(store) : "/search";

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const cartCurrency = items[0]?.currencyCode ?? "";
  const hasProducts = useMemo(() => cartHasProducts(items), [items]);

  const needsAddress = hasProducts && mode === "shipping";
  const pinReady =
    delivery.pinPlaced && delivery.latitude != null && delivery.longitude != null;
  const deliveryComplete = isDeliveryComplete(mode, delivery);

  // Auto-cálculo del total con envío (debounce), como en la referencia. Para envío
  // requiere el pin colocado; para recogida no hay tarifa de mensajería.
  useEffect(() => {
    if (!items.length) {
      resetPreview();
      return;
    }
    const ready = needsAddress ? pinReady : true;
    if (!ready) {
      resetPreview();
      return;
    }
    const timer = globalThis.setTimeout(() => {
      runPreview({
        customerFirstName: "-",
        customerLastName: "-",
        phonePrimary: "-",
        phoneSecondary: null,
        deliveryMode: mode,
        deliveryAddress: null,
        deliveryLatitude: needsAddress ? delivery.latitude : null,
        deliveryLongitude: needsAddress ? delivery.longitude : null,
        paymentMethod: "platform",
        affiliateCode: null,
        lines: items.map((i) => ({
          productId: i.kind === "product" ? i.productId ?? null : null,
          serviceId: i.kind === "service" ? i.serviceId ?? null : null,
          quantity: i.quantity,
        })),
      });
    }, 400);
    return () => globalThis.clearTimeout(timer);
  }, [
    items,
    mode,
    needsAddress,
    hasProducts,
    pinReady,
    delivery.latitude,
    delivery.longitude,
    runPreview,
    resetPreview,
  ]);

  const previewError = previewErrorRaw
    ? errorToUserMessage(previewErrorRaw, "No se pudo calcular el envío.")
    : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!items.length) {
      toast.error("Tu carrito está vacío.");
      return;
    }
    if (!deliveryComplete) {
      toast.error("Completa los datos de entrega antes de pagar.");
      setDeliveryModalOpen(true);
      return;
    }
    if (previewLoading) {
      toast.error("Calculando envío…");
      return;
    }
    try {
      const res = await create.mutateAsync(buildOrderRequest(items, mode, delivery));
      clear();
      toast.success(`Pedido ${res.publicNumber} creado.`);
      navigate(`/pedido/${encodeURIComponent(res.publicNumber)}`);
    } catch (err) {
      toast.error(errorToUserMessage(err, "No se pudo crear el pedido."));
    }
  }

  function confirmDelivery(data: DeliveryFormData) {
    setDelivery(data);
    setDeliveryModalOpen(false);
    toast.success("Datos de entrega guardados.");
  }

  const summaryCurrency = preview?.currencyCode ?? cartCurrency;
  const deliveryAddressLine = [delivery.address.trim(), delivery.city.trim()]
    .filter(Boolean)
    .join(", ");

  return {
    store,
    backHref,
    items,
    isEmpty: items.length === 0,
    mode,
    setMode,
    delivery,
    deliveryModalOpen,
    openDeliveryModal: () => setDeliveryModalOpen(true),
    closeDeliveryModal: () => setDeliveryModalOpen(false),
    confirmDelivery,
    needsAddress,
    pinReady,
    deliveryComplete,
    deliveryAddressLine,
    preview,
    previewLoading,
    previewError,
    subtotal,
    summaryCurrency,
    hasProducts,
    isCreating: create.isPending,
    submit,
  };
}
