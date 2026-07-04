import { jsPDF } from "jspdf";
import { formatMoney, statusLabel } from "./formatMoney";
import type { OrderTrackingDto } from "../Dtos/orders";

/** jsPDF + Helvetica no renderizan bien algunos Unicode (guiones tipográficos, espacios finos). */
function sanitize(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u00A0\u202F\u2009\u2007]/g, " ");
}

function money(amount: number, currencyCode: string): string {
  return sanitize(formatMoney(amount, currencyCode));
}

/**
 * Comprobante del pedido (desglose de líneas + totales) generado en el navegador.
 * Réplica del comprobante de la app de referencia adaptado a `OrderTrackingDto`; la
 * tabla se dibuja a mano porque `jspdf-autotable` no está en las dependencias.
 */
export function downloadOrderTrackingPdf(order: OrderTrackingDto): void {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const maxW = pageW - margin * 2;
  const qtyX = pageW - margin - 55;
  const unitX = pageW - margin - 26;
  const amountX = pageW - margin;
  let y = 20;

  const storeName = sanitize(order.storeName?.trim() || "Tienda");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const storeNameLines = doc.splitTextToSize(storeName, maxW) as string[];
  doc.text(storeNameLines, margin, y);
  y += storeNameLines.length * 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text("VibeTrade", margin, y);
  doc.setTextColor(0, 0, 0);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Comprobante de pedido", margin, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const created = new Date(order.createdAtUtc);
  const dateStr = Number.isNaN(created.getTime())
    ? ""
    : created.toLocaleString("es", { dateStyle: "short", timeStyle: "short" });
  doc.text(`No. pedido: ${sanitize(order.publicNumber)}`, margin, y);
  y += 5;
  if (dateStr) {
    doc.text(`Fecha: ${sanitize(dateStr)}`, margin, y);
    y += 5;
  }
  doc.text(`Estado: ${sanitize(statusLabel(order.status))}`, margin, y);
  y += 5;
  const entrega =
    order.deliveryMode === "pickup"
      ? "Recoger en almacén"
      : order.deliveryAddress || "Envío a domicilio";
  const addrLines = doc.splitTextToSize(
    `Entrega: ${sanitize(entrega)}`,
    maxW,
  ) as string[];
  doc.text(addrLines, margin, y);
  y += addrLines.length * 5 + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Producto", margin, y);
  doc.text("Cant.", qtyX, y, { align: "right" });
  doc.text("P. unit.", unitX, y, { align: "right" });
  doc.text("Importe", amountX, y, { align: "right" });
  y += 3;
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageW - margin, y);
  y += 4.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const orderCur = order.currencyCode;
  for (const l of order.lines) {
    const lineCur = l.currencyCode || orderCur;
    const nameLines = doc.splitTextToSize(
      sanitize(l.productName),
      qtyX - margin - 4,
    ) as string[];
    doc.text(nameLines[0] ?? "", margin, y);
    doc.text(String(l.quantity), qtyX, y, { align: "right" });
    doc.text(money(l.unitPrice, lineCur), unitX, y, { align: "right" });
    doc.text(money(l.lineTotal, lineCur), amountX, y, { align: "right" });
    y += 4.6;
    for (let i = 1; i < nameLines.length; i++) {
      doc.text(nameLines[i] ?? "", margin, y);
      y += 4.6;
    }
  }

  y += 2;
  doc.setDrawColor(210, 210, 210);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.text(`Subtotal: ${money(order.subtotal, orderCur)}`, amountX, y, {
    align: "right",
  });
  y += 6;
  doc.text(`Mensajería: ${money(order.deliveryFee, orderCur)}`, amountX, y, {
    align: "right",
  });
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${money(order.total, orderCur)}`, amountX, y, {
    align: "right",
  });

  const safe = order.publicNumber.replace(/[^\w.-]+/g, "_") || "pedido";
  doc.save(`comprobante-${safe}.pdf`);
}
