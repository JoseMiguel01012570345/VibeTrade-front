import { jsPDF } from "jspdf";
import type { TradeAgreement } from "../domain/tradeAgreementTypes";
import type { AgreementCheckoutBreakdownApi } from "../../../utils/chat/agreementCheckoutApi";
import {
  minorToMajor,
  paymentFeeLabels,
  stripeMinorDecimals,
} from "../domain/paymentFeePolicy";
import { appendQrAnnexToPdf } from "./tradeAgreementPdfDownload";
import { collectAgreementQrLinkEntries } from "./tradeAgreementPdfText";
import type { PaymentFeeReceiptPayload } from "../domain/paymentFeeReceiptTypes";
import { STRIPE_PRICING_PAGE_URL } from "../domain/stripePricingLinks";

const BODY_PT = 9.5;
const ITEM_PT = 8.5;
const TITLE_PT = 15;
const SECTION_PT = 11;

/** Helvetica + jsPDF se rompen con espacios raros; evita “S E 1 1 …” y muros ilegibles. */
function sanitizePdfLabel(raw: string): string {
  let s = raw
    .normalize("NFC")
    .replace(/[\u00a0\u2000-\u200f\u202f\u205f\u3000\ufeff]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 6 && parts.every((p) => p.length === 1)) {
    s = parts.join("");
  }
  return s;
}

function ensureY(
  doc: InstanceType<typeof jsPDF>,
  y: number,
  pageH: number,
  margin: number,
  needMm: number,
): number {
  if (y + needMm <= pageH - margin) return y;
  doc.addPage();
  return margin;
}

/** Dibuja líneas de ítem: etiqueta a la izquierda (varias líneas) e importe alineado a la derecha en la última línea. */
function drawWrappedLineItem(
  doc: InstanceType<typeof jsPDF>,
  y: number,
  margin: number,
  pageW: number,
  pageH: number,
  maxContentW: number,
  label: string,
  amountStr: string,
): number {
  let yy = ensureY(doc, y, pageH, margin, 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(ITEM_PT);
  const body = sanitizePdfLabel(label);
  const amountW = doc.getTextWidth(amountStr);
  const labelMaxW = Math.max(40, maxContentW - amountW - 5);
  const labelLines = doc.splitTextToSize(body, labelMaxW) as string[];
  const lineH = 3.9;
  for (let i = 0; i < labelLines.length; i++) {
    yy = ensureY(doc, yy, pageH, margin, lineH);
    const prefix = i === 0 ? "• " : "  ";
    doc.text(prefix + labelLines[i], margin, yy);
    if (i === labelLines.length - 1) {
      doc.text(amountStr, pageW - margin - amountW, yy);
    }
    yy += lineH;
  }
  return yy + 1.2;
}

function safeInformeFilename(agreementTitle: string): string {
  const slug = agreementTitle
    .trim()
    .slice(0, 42)
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_.]/g, "")
    .toLowerCase();
  const base = slug.length > 2 ? slug : "acuerdo";
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `Factura-${base}-${y}${mo}${da}.pdf`;
}

function fmtMoney(amountMinor: number, curLower: string): string {
  const maj = minorToMajor(amountMinor, curLower);
  const frac = stripeMinorDecimals(curLower);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: curLower.slice(0, 3).toUpperCase(),
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  }).format(maj);
}

/** PDF del informe de pago del checkout acordado + anexo QR (Stripe + enlaces del acuerdo). */
export async function downloadPaymentCheckoutInformePdf(
  agreement: TradeAgreement,
  breakdown: AgreementCheckoutBreakdownApi,
  threadId: string,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxW = pageW - margin * 2;
  let y = margin;

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TITLE_PT);
  doc.text("Informe de pago", margin, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const d = new Date();
  const fecha = d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  doc.text(`Generado: ${fecha}`, pageW - margin, 14, { align: "right" });
  doc.setTextColor(15, 23, 42);
  y = 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(BODY_PT);
  doc.text(`Acuerdo: ${(agreement.title ?? "").trim() || "(sin título)"}`, margin, y);
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY_PT);
  doc.setTextColor(71, 85, 105);
  const head = [
    `Vigencia aceptada por el comprador. Incluye recargo clima ${paymentFeeLabels.climateRateDisplay} sobre subtotal y estimación de tarjeta ${paymentFeeLabels.stripePctDisplay} + fijo según moneda (ver ${STRIPE_PRICING_PAGE_URL}).`,
  ];
  for (const line of head) {
    const wrapped = doc.splitTextToSize(line, maxW) as string[];
    for (const w of wrapped) {
      y = ensureY(doc, y, pageH, margin, 6);
      doc.text(w, margin, y);
      y += 4.6;
    }
  }
  doc.setTextColor(15, 23, 42);
  y += 3;

  if (!breakdown.ok && breakdown.errors.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(BODY_PT);
    doc.setTextColor(180, 83, 9);
    y = ensureY(doc, y, pageH, margin, 8);
    doc.text("Validación", margin, y);
    y += 5.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY_PT);
    doc.setTextColor(71, 55, 15);
    for (const e of breakdown.errors) {
      const wrapped = doc.splitTextToSize(`• ${sanitizePdfLabel(e)}`, maxW) as string[];
      for (const w of wrapped) {
        y = ensureY(doc, y, pageH, margin, 5);
        doc.text(w, margin, y);
        y += 4.4;
      }
    }
    doc.setTextColor(15, 23, 42);
    y += 4;
  }

  for (const bc of breakdown.byCurrency) {
    const cur = bc.currencyLower;
    y = ensureY(doc, y, pageH, margin, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(SECTION_PT);
    doc.setTextColor(30, 64, 175);
    doc.text(`Moneda ${cur.toUpperCase()}`, margin, y);
    doc.setTextColor(15, 23, 42);
    y += 6;

    const totalRows: { label: string; value: string; strong?: boolean }[] = [
      { label: "Subtotal (ítems)", value: fmtMoney(bc.subtotalMinor, cur) },
      { label: `Climate (${paymentFeeLabels.climateRateDisplay})`, value: fmtMoney(bc.climateMinor, cur) },
      {
        label: `Tarifa Stripe estimada (${paymentFeeLabels.stripePctDisplay} + fijo)`,
        value: fmtMoney(bc.stripeFeeMinor, cur),
      },
      { label: "Total a cobrar", value: fmtMoney(bc.totalMinor, cur), strong: true },
    ];
    const boxPad = 3;
    const rowH = 4.8;
    const boxH = boxPad * 2 + totalRows.length * rowH + 2;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, maxW, boxH, 1.5, 1.5, "FD");
    let innerY = y + boxPad + 3.8;
    const labelX = margin + boxPad + 1;
    const valueX = pageW - margin - boxPad;
    for (const row of totalRows) {
      doc.setFont("helvetica", row.strong ? "bold" : "normal");
      doc.setFontSize(row.strong ? 10 : BODY_PT);
      doc.text(row.label, labelX, innerY);
      const vw = doc.getTextWidth(row.value);
      doc.text(row.value, valueX - vw, innerY);
      innerY += rowH;
    }
    y += boxH + 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("Conceptos incluidos", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(ITEM_PT);

    for (const ln of bc.lines) {
      const amt = fmtMoney(ln.amountMinor, cur);
      y = drawWrappedLineItem(doc, y, margin, pageW, pageH, maxW, ln.label, amt);
    }
    y += 4;
  }

  const qrEntries = [
    { label: "Precios y políticas de procesamiento (Stripe)", url: STRIPE_PRICING_PAGE_URL },
    ...collectAgreementQrLinkEntries(agreement, { threadId }),
  ];

  await appendQrAnnexToPdf(doc, qrEntries, margin, pageW, pageH);

  doc.save(safeInformeFilename(agreement.title ?? ""));
}

function safeReceiptFilename(agreementTitle: string, paymentId: string): string {
  const slug = agreementTitle
    .trim()
    .slice(0, 32)
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_.]/g, "")
    .toLowerCase();
  const base = slug.length > 2 ? slug : "recibo";
  const tail = paymentId.replace(/^agpay_/, "").slice(0, 12);
  return `Recibo-pago-${base}-${tail}.pdf`;
}

/** PDF post-cobro: mismo layout que el informe + tarifa Stripe real y anexo QR. */
export async function downloadPaymentFeeReceiptPdf(
  receipt: PaymentFeeReceiptPayload,
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxW = pageW - margin * 2;
  let y = margin;
  const cur = receipt.currencyLower;

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(TITLE_PT);
  doc.text("Recibo de pago (liquidado)", margin, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const d = new Date();
  doc.text(
    `Generado: ${d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}`,
    pageW - margin,
    14,
    { align: "right" },
  );
  doc.setTextColor(15, 23, 42);
  y = 28;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(BODY_PT);
  doc.text(`Acuerdo: ${receipt.agreementTitle.trim() || "(sin título)"}`, margin, y);
  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY_PT);
  doc.setTextColor(71, 85, 105);
  const head = [
    `Id. de cobro: ${receipt.paymentId}`,
    `Incluye clima ${paymentFeeLabels.climateRateDisplay} sobre subtotal y tarifa Stripe según liquidación (puede diferir de la estimación previa).`,
    `Políticas Stripe: ${receipt.stripePricingUrl} (QR en anexo).`,
  ];
  for (const line of head) {
    const wrapped = doc.splitTextToSize(line, maxW) as string[];
    for (const w of wrapped) {
      y = ensureY(doc, y, pageH, margin, 6);
      doc.text(w, margin, y);
      y += 4.6;
    }
  }
  doc.setTextColor(15, 23, 42);
  y += 4;

  y = ensureY(doc, y, pageH, margin, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(SECTION_PT);
  doc.setTextColor(30, 64, 175);
  doc.text(`Moneda ${cur.toUpperCase()}`, margin, y);
  doc.setTextColor(15, 23, 42);
  y += 6;

  const totalRows: { label: string; value: string; strong?: boolean }[] = [
    { label: "Subtotal (ítems)", value: fmtMoney(receipt.subtotalMinor, cur) },
    { label: `Climate (${paymentFeeLabels.climateRateDisplay})`, value: fmtMoney(receipt.climateMinor, cur) },
    {
      label: "Tarifa Stripe (liquidación)",
      value: fmtMoney(receipt.stripeFeeMinorActual, cur),
    },
    {
      label: "Tarifa Stripe estimada (antes del pago)",
      value: fmtMoney(receipt.stripeFeeMinorEstimated, cur),
    },
    { label: "Total cobrado al comprador", value: fmtMoney(receipt.totalChargedMinor, cur), strong: true },
  ];
  const boxPad = 3;
  const rowH = 4.8;
  const boxH = boxPad * 2 + totalRows.length * rowH + 2;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, maxW, boxH, 1.5, 1.5, "FD");
  let innerY = y + boxPad + 3.8;
  const labelX = margin + boxPad + 1;
  const valueX = pageW - margin - boxPad;
  for (const row of totalRows) {
    doc.setFont("helvetica", row.strong ? "bold" : "normal");
    doc.setFontSize(row.strong ? 10 : BODY_PT);
    doc.text(row.label, labelX, innerY);
    const vw = doc.getTextWidth(row.value);
    doc.text(row.value, valueX - vw, innerY);
    innerY += rowH;
  }
  y += boxH + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("Conceptos incluidos", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(ITEM_PT);
  for (const ln of receipt.lines) {
    const amt = fmtMoney(ln.amountMinor, cur);
    y = drawWrappedLineItem(doc, y, margin, pageW, pageH, maxW, ln.label, amt);
  }

  const qrEntries = [
    {
      label: "Políticas y precios de procesamiento (Stripe)",
      url: receipt.stripePricingUrl,
    },
  ];
  await appendQrAnnexToPdf(doc, qrEntries, margin, pageW, pageH);

  doc.save(safeReceiptFilename(receipt.agreementTitle, receipt.paymentId));
}
