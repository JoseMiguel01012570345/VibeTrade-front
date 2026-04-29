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

const LINE_GAP_MM = 5;

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

/** PDF del informe de pago del checkout acordado + anexo solo QR (URLs de enlaces/adjuntos y chat/hoja). */
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Informe de pago", margin, y);
  y += LINE_GAP_MM * 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const head = [
    `Acuerdo: ${(agreement.title ?? "").trim() || "(sin título)"}`,
    `Comprador acepta según vigencia; incluye clima ${paymentFeeLabels.climateRateDisplay} y estimación de tarjeta ${paymentFeeLabels.stripePctDisplay} + fijo según moneda.`,
  ];
  for (const line of head) {
    const wrapped = doc.splitTextToSize(line, maxW) as string[];
    for (const w of wrapped) {
      if (y > pageH - margin - 6) {
        doc.addPage();
        y = margin;
      }
      doc.text(w, margin, y);
      y += LINE_GAP_MM;
    }
  }
  y += LINE_GAP_MM * 0.5;

  if (!breakdown.ok && breakdown.errors.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Validación", margin, y);
    y += LINE_GAP_MM;
    doc.setFont("helvetica", "normal");
    for (const e of breakdown.errors) {
      const wrapped = doc.splitTextToSize(`• ${e}`, maxW) as string[];
      for (const w of wrapped) {
        if (y > pageH - margin - 6) {
          doc.addPage();
          y = margin;
        }
        doc.text(w, margin, y);
        y += LINE_GAP_MM * 0.95;
      }
    }
    y += LINE_GAP_MM;
  }

  for (const bc of breakdown.byCurrency) {
    doc.setFont("helvetica", "bold");
    const cur = bc.currencyLower;
    doc.text(`Moneda ${cur.toUpperCase()}`, margin, y);
    y += LINE_GAP_MM;

    doc.setFont("helvetica", "normal");
    const totals = [
      `Subtotal: ${fmtMoney(bc.subtotalMinor, cur)}`,
      `Climate: ${fmtMoney(bc.climateMinor, cur)}`,
      `Tarifa estimada Stripe: ${fmtMoney(bc.stripeFeeMinor, cur)}`,
      `TOTAL a cobrar: ${fmtMoney(bc.totalMinor, cur)}`,
    ];
    for (const line of totals) {
      if (y > pageH - margin - 6) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += LINE_GAP_MM * 1.05;
    }
    y += LINE_GAP_MM * 0.4;

    for (const ln of bc.lines) {
      const amt = fmtMoney(ln.amountMinor, cur);
      const line = `- ${ln.label} — ${amt}`;
      const wrapped = doc.splitTextToSize(line, maxW) as string[];
      for (const w of wrapped) {
        if (y > pageH - margin - 6) {
          doc.addPage();
          y = margin;
        }
        doc.text(w, margin, y);
        y += LINE_GAP_MM * 0.92;
      }
    }
    y += LINE_GAP_MM;
  }

  const qrEntries = collectAgreementQrLinkEntries(agreement, {
    threadId,
  });

  await appendQrAnnexToPdf(doc, qrEntries, margin, pageW, pageH);

  doc.save(safeInformeFilename(agreement.title ?? ""));
}
