import type { CartItem } from "./cartStore";
import type { CreateOrderRequest, OrderDeliveryMode } from "../Dtos/orders";

/** Datos de entrega capturados en el modal del checkout. */
export type DeliveryFormData = {
  fullName: string;
  address: string;
  city: string;
  phone: string;
  phone2: string;
  latitude: number | null;
  longitude: number | null;
  pinPlaced: boolean;
};

export const EMPTY_DELIVERY: DeliveryFormData = {
  fullName: "",
  address: "",
  city: "",
  phone: "",
  phone2: "",
  latitude: null,
  longitude: null,
  pinPlaced: false,
};

/** Parte el nombre completo en nombre + apellidos para el pedido. */
export function splitFullName(full: string): { first: string; last: string } {
  const t = full.trim();
  if (!t) return { first: "-", last: "-" };
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "-" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/** Envío requiere pin en el mapa; recogida solo contacto. */
export function isDeliveryComplete(
  mode: OrderDeliveryMode,
  d: DeliveryFormData,
): boolean {
  if (mode === "shipping") {
    return Boolean(
      d.fullName.trim() &&
        d.address.trim() &&
        d.city.trim() &&
        d.phone.trim() &&
        d.pinPlaced &&
        d.latitude != null &&
        d.longitude != null,
    );
  }
  return Boolean(d.fullName.trim() && d.phone.trim());
}

/** Arma la solicitud de creación de pedido a partir del carrito y la entrega. */
export function buildOrderRequest(
  items: CartItem[],
  mode: OrderDeliveryMode,
  delivery: DeliveryFormData,
): CreateOrderRequest {
  const needsAddress = mode === "shipping";
  const { first, last } = splitFullName(delivery.fullName);
  const deliveryAddress = needsAddress
    ? [delivery.address.trim(), delivery.city.trim()].filter(Boolean).join(", ") ||
      null
    : null;
  return {
    customerFirstName: first,
    customerLastName: last,
    phonePrimary: delivery.phone.trim(),
    phoneSecondary: delivery.phone2.trim() || null,
    deliveryMode: mode,
    deliveryAddress,
    deliveryLatitude: needsAddress ? delivery.latitude : null,
    deliveryLongitude: needsAddress ? delivery.longitude : null,
    paymentMethod: "platform",
    affiliateCode: null,
    lines: items.map((i) => ({
      productId: i.kind === "product" ? i.productId ?? null : null,
      serviceId: i.kind === "service" ? i.serviceId ?? null : null,
      quantity: i.quantity,
    })),
  };
}
