/** Tipos del dominio Pedido (alineados con Features/Orders del backend, JSON camelCase). */

export type OrderStatus = "procesado" | "en_transito" | "entregado";
export type OrderDeliveryMode = "pickup" | "shipping";
export type OrderPaymentStatus = "held" | "released" | "refunded";
export type OrderEvidenceDecision = "none" | "pending" | "accepted" | "rejected";

export type CheckoutCartLine = {
  productId?: string | null;
  serviceId?: string | null;
  quantity: number;
};

export type CreateOrderRequest = {
  customerFirstName: string;
  customerLastName: string;
  phonePrimary: string;
  phoneSecondary?: string | null;
  deliveryMode: OrderDeliveryMode;
  deliveryAddress?: string | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  paymentMethod?: string | null;
  affiliateCode?: string | null;
  lines: CheckoutCartLine[];
};

export type CheckoutPreviewLine = {
  lineKind: "product" | "service";
  productId?: string | null;
  serviceId?: string | null;
  lineName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currencyCode: string;
  recurrenceMonth?: number | null;
  recurrenceDay?: number | null;
};

export type CheckoutPreviewResponse = {
  storeId: string;
  currencyCode: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  pricePerKm: number;
  routeDistanceKm?: number | null;
  lines: CheckoutPreviewLine[];
};

export type CreateOrderResponse = {
  orderId: string;
  publicNumber: string;
  status: OrderStatus;
  currencyCode: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
};

export type OrderLineDto = {
  id: string;
  lineKind: "product" | "service";
  productId?: string | null;
  serviceId?: string | null;
  productName: string;
  technicalSpecs: string;
  serviceTipo?: string | null;
  recurrenceMonth?: number | null;
  recurrenceDay?: number | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currencyCode: string;
};

export type OrderTrackingDto = {
  id: string;
  publicNumber: string;
  status: OrderStatus;
  storeId: string;
  storeName: string;
  deliveryMode: OrderDeliveryMode;
  deliveryAddress: string;
  currencyCode: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentStatus: OrderPaymentStatus;
  clientEvidenceDecision: OrderEvidenceDecision;
  clientEvidenceUrls: string[];
  clientEvidenceNote?: string | null;
  clientEvidenceSubmittedAtUtc?: string | null;
  routeSheetId?: string | null;
  routeDistanceKm?: number | null;
  createdAtUtc: string;
  lines: OrderLineDto[];
};

export type OrderSummaryDto = {
  id: string;
  publicNumber: string;
  status: OrderStatus;
  storeId: string;
  currencyCode: string;
  total: number;
  paymentStatus: OrderPaymentStatus;
  createdAtUtc: string;
};
