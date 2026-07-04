import { trackOrder } from "../api/ordersApi";
import { downloadOrderTrackingPdf } from "./orderTrackingPdf";

/** Descarga el comprobante PDF tras leer el pedido del API por número público. */
export async function downloadOrderReceiptPdf(
  publicNumber: string,
): Promise<void> {
  const order = await trackOrder(publicNumber);
  downloadOrderTrackingPdf(order);
}
