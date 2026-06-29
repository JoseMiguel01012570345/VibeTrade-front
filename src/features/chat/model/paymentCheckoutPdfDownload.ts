import { jsPDF } from "jspdf";
import type { TradeAgreement } from "@features/chat/model/tradeAgreementTypes";
import type { AgreementCheckoutBreakdownApi } from "@features/chat/api/agreementCheckoutApi";
import {
  minorToMajor,
  paymentFeeLabels,
  currencyMinorDecimals,
} from "@features/payments/model/paymentFeePolicy";
import { appendQrAnnexToPdf } from "./tradeAgreementPdfDownload";
import { collectAgreementQrLinkEntries } from "./tradeAgreementPdfText";
import type { PaymentFeeReceiptPayload } from "@features/payments/Dtos/paymentFeeReceiptTypes";
import { PAYMENT_FEE_POLICY_URL } from "@features/payments/model/paymentFeePolicyLinks";

const BODY_PT = 9.5;
const ITEM_PT = 8.5;
const TITLE_PT = 15;
const SECTION_PT = 11;

/** Helvetica + jsPDF se rompen con espacios raros; evita “S E 1 1 …” y muros ilegibles. */
export function sanitizePaymentInformeLabel(raw: string): string {
  return raw.normalize("NFC").replace(/\s+/g, " ").trim();
}

/**
 * Fuentes estándar de jsPDF (Helvetica): glifos y `getTextWidth` fallan con Unicode fuera de lo
 * que el motor codifica bien (p. ej. U+2014, U+2192) y con acentos si el ancho no coincide.
 * Normaliza a texto ASCII imprimible para que el wrap medido y el render no destrocen el layout.
 */
export function sanitizeTextForStandardPdfFont(raw: string): string {
  let s = raw.normalize("NFC");
  s = s.replace(/[\u200B-\u200D\uFEFF\u2060]/g, "");
  s = s.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-");
  s = s.replace(/\u2192/g, "->");
  s = s.replace(/\u2190/g, "<-");
  s = s.replace(/\u2194/g, "<->");
  s = s.replace(/[\u2794\u279C]/g, "->");
  s = s.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
  s = s.replace(/[\u201C\u201D\u201E\u201F]/g, '"');
  s = s.replace(/\u2026/g, "...");
  s = s.replace(/[\u00A0\u202F\u2007]/g, " ");
  s = s.normalize("NFD").replace(/\p{M}+/gu, "");
  s = s.replace(/\u00df/gi, "ss");
  s = s.replace(/[^\x20-\x7E]/g, "");
  return s.replace(/\s+/g, " ").trim();
}

function sanitizePdfLabel(raw: string): string {
  return sanitizeTextForStandardPdfFont(sanitizePaymentInformeLabel(raw));
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

/**
 * Parte el texto en líneas usando el mismo motor de medida que `doc.text`.
 * `splitTextToSize` de jsPDF a veces devuelve líneas más anchas de lo que luego ocupa el render, y el texto invade el margen o el importe.
 */
function wrapLineItemBodyToMeasuredLines(
  doc: InstanceType<typeof jsPDF>,
  body: string,
  bulletFirst: string,
  bulletCont: string,
  labelSlotWmm: number,
): string[] {
  const slot = Math.max(12, labelSlotWmm - 0.8);
  const lines: string[] = [];
  let rest = body.replace(/^\s+/, "").replace(/\s+$/, "");
  let prefix = bulletFirst;

  while (rest.length > 0) {
    let lo = 1;
    let hi = rest.length;
    let best = 0;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const slice = rest.slice(0, mid);
      if (doc.getTextWidth(prefix + slice) <= slot) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    let take = best > 0 ? best : 1;
    if (take < rest.length) {
      const cand = rest.slice(0, take);
      const sp = cand.lastIndexOf(" ");
      if (sp > 0) take = sp;
    }

    let chunk = rest.slice(0, take).replace(/\s+$/u, "");
    rest = rest.slice(take).replace(/^\s+/u, "");

    if (!chunk.length) {
      const cp = rest.codePointAt(0);
      if (cp === undefined) break;
      const ulen = cp > 0xffff ? 2 : 1;
      chunk = rest.slice(0, ulen);
      rest = rest.slice(ulen).replace(/^\s+/u, "");
    }

    lines.push(chunk);
    prefix = bulletCont;
  }

  return lines;
}

/** Dibuja líneas de ítem: etiqueta a la izquierda (varias líneas) e importe alineado a la derecha en la última línea. */
function drawWrappedLineItem(
  doc: InstanceType<typeof jsPDF>,
  y: number,
  margin: number,
  pageW: number,
  pageH: number,
  label: string,
  amountStr: string,
): number {
  let yy = ensureY(doc, y, pageH, margin, 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(ITEM_PT);
  const body = sanitizePdfLabel(label);
  const amountW = doc.getTextWidth(amountStr);
  const gapBeforeAmount = 4;
  const labelColumnRight = pageW - margin - amountW - gapBeforeAmount;
  const labelSlotWmm = Math.max(28, labelColumnRight - margin);
  const bulletFirst = "• ";
  const bulletCont = "  ";

  const labelLines = wrapLineItemBodyToMeasuredLines(
    doc,
    body,
    bulletFirst,
    bulletCont,
    labelSlotWmm,
  );
  const lineH = 3.9;
  for (let i = 0; i < labelLines.length; i++) {
    yy = ensureY(doc, yy, pageH, margin, lineH);
    const prefix = i === 0 ? bulletFirst : bulletCont;
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
  const frac = currencyMinorDecimals(curLower);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: curLower.slice(0, 3).toUpperCase(),
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  }).format(maj);
}

/** PDF del informe de pago del checkout acordado + anexo QR (pasarela + enlaces del acuerdo). */
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
  doc.text(
    `Acuerdo: ${sanitizeTextForStandardPdfFont((agreement.title ?? "").trim()) || "(sin titulo)"}`,
    margin,
    y,
  );
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY_PT);
  doc.setTextColor(71, 85, 105);
  const head = [
    `Vigencia aceptada por el comprador. El cargo con tarjeta es el subtotal de ítems. Climate (${paymentFeeLabels.climateRateDisplay}) y tarifa de procesador estimada (${paymentFeeLabels.processorPctDisplay} + fijo) son solo referencia y no se suman al cobro (ver ${PAYMENT_FEE_POLICY_URL}).`,
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
      const wrapped = doc.splitTextToSize(
        `• ${sanitizePdfLabel(e)}`,
        maxW,
      ) as string[];
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
      {
        label: `Climate ref. (${paymentFeeLabels.climateRateDisplay}, no cobrado)`,
        value: fmtMoney(bc.climateMinor, cur),
      },
      {
        label: `tarifa de procesador estimada ref. (${paymentFeeLabels.processorPctDisplay} + fijo, no cobrada)`,
        value: fmtMoney(bc.processorFeeMinor, cur),
      },
      {
        label: "Total a cobrar con tarjeta (subtotal)",
        value: fmtMoney(bc.totalMinor, cur),
        strong: true,
      },
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
      y = drawWrappedLineItem(doc, y, margin, pageW, pageH, ln.label, amt);
    }
    y += 4;
  }

  const qrEntries = [
    {
      label: "Precios y políticas de procesamiento (pasarela)",
      url: PAYMENT_FEE_POLICY_URL,
    },
    ...collectAgreementQrLinkEntries(agreement, { threadId }),
  ];

  await appendQrAnnexToPdf(doc, qrEntries, margin, pageW, pageH);

  doc.save(safeInformeFilename(agreement.title ?? ""));
}

function safeReceiptFilename(
  agreementTitle: string,
  paymentId: string,
): string {
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

/** PDF post-cobro: mismo layout que el informe + tarifa de procesador real y anexo QR. */
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

  const issuerPlat =
    (receipt.invoiceIssuerPlatform ?? "").trim() || "VibeTrade";
  const storeNm = (receipt.invoiceStoreName ?? "").trim();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY_PT);
  doc.text(`Emisor: ${sanitizeTextForStandardPdfFont(issuerPlat)}`, margin, y);
  y += 5.5;
  if (storeNm.length > 0) {
    doc.text(
      `Tienda (chat): ${sanitizeTextForStandardPdfFont(storeNm)}`,
      margin,
      y,
    );
    y += 5.5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(BODY_PT);
  doc.text(
    `Acuerdo: ${sanitizeTextForStandardPdfFont(receipt.agreementTitle.trim()) || "(sin titulo)"}`,
    margin,
    y,
  );
  y += 5.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY_PT);
  doc.setTextColor(71, 85, 105);
  const head = [
    `Id. de cobro: ${receipt.paymentId}`,
    `El importe cobrado al comprador es el subtotal. Climate (${paymentFeeLabels.climateRateDisplay}) y cifras de procesador son referencia; la liquidación real puede diferir de la estimación previa.`,
    `Políticas de tarifas: ${receipt.paymentFeePolicyUrl} (QR en anexo).`,
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
    {
      label: `Climate ref. (${paymentFeeLabels.climateRateDisplay}, no cobrado)`,
      value: fmtMoney(receipt.climateMinor, cur),
    },
    {
      label: "tarifa de procesador liquidación (referencia)",
      value: fmtMoney(receipt.processorFeeMinorActual, cur),
    },
    {
      label: "tarifa de procesador estimada antes del pago (referencia)",
      value: fmtMoney(receipt.processorFeeMinorEstimated, cur),
    },
    {
      label: "Total cobrado al comprador (subtotal)",
      value: fmtMoney(receipt.totalChargedMinor, cur),
      strong: true,
    },
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
    y = drawWrappedLineItem(doc, y, margin, pageW, pageH, ln.label, amt);
  }

  const qrEntries = [
    {
      label: "Políticas y precios de procesamiento (pasarela)",
      url: receipt.paymentFeePolicyUrl,
    },
  ];
  await appendQrAnnexToPdf(doc, qrEntries, margin, pageW, pageH);

  doc.save(safeReceiptFilename(receipt.agreementTitle, receipt.paymentId));
}
