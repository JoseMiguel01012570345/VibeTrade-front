import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import type { TradeAgreement } from "../domain/tradeAgreementTypes";
import type { StoreCatalog } from "../domain/storeCatalogTypes";
import {
  buildTradeAgreementPlainDocument,
  collectAgreementQrLinkEntries,
} from "./tradeAgreementPdfText";

function safePdfFilename(title: string, issuedAtMs: number): string {
  const d = new Date(issuedAtMs);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const slug = title
    .trim()
    .slice(0, 48)
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_.]/g, "")
    .toLowerCase();
  const base = slug.length > 2 ? slug : "acuerdo";
  return `acuerdo-${base}-${y}${mo}${da}.pdf`;
}

const QR_BOX_MM = 40;
const LINE_GAP_MM = 5;

export async function appendQrAnnexToPdf(
  doc: InstanceType<typeof jsPDF>,
  entries: readonly { label: string; url: string }[],
  marginMm: number,
  pageW: number,
  pageH: number,
): Promise<void> {
  if (entries.length === 0) return;

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Anexos — códigos QR por enlace", marginMm, marginMm + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const introLines = doc.splitTextToSize(
    "Cada código contiene el enlace público a una foto, un documento adjunto o la hoja de ruta externa. Escanéalos con la cámara (requiere conexión y acceso a esa URL).",
    pageW - marginMm * 2,
  ) as string[];
  let y = marginMm + 14;
  for (const line of introLines) {
    doc.text(line, marginMm, y);
    y += LINE_GAP_MM * 0.78;
  }
  y += LINE_GAP_MM;

  const textW = pageW - marginMm * 2;

  for (let i = 0; i < entries.length; i++) {
    const { label, url } = entries[i];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const heading = `${i + 1}. ${label}`;
    const titleLines = doc.splitTextToSize(heading, textW) as string[];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const urlLines = doc.splitTextToSize(url, textW) as string[];

    const titleH = titleLines.length * LINE_GAP_MM * 0.82;
    const urlH = urlLines.length * 3.6;
    /** Altura necesaria hasta el próximo ítem completo */
    const nextBlockH =
      titleH +
      QR_BOX_MM +
      6 +
      urlH +
      12;

    if (y + nextBlockH > pageH - marginMm) {
      doc.addPage();
      y = marginMm;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    for (const tl of titleLines) {
      doc.text(tl, marginMm, y);
      y += LINE_GAP_MM * 0.82;
    }

    const qrY = y + 2;
    const pngDataUrl = await QRCode.toDataURL(url, {
      width: 620,
      margin: 1,
      errorCorrectionLevel: "M",
      type: "image/png",
      color: { dark: "#000000", light: "#ffffff" },
    });

    doc.addImage(pngDataUrl, "PNG", marginMm, qrY, QR_BOX_MM, QR_BOX_MM);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    let uy = qrY + QR_BOX_MM + 4;
    for (const ul of urlLines) {
      doc.text(ul, marginMm, uy);
      uy += 3.6;
    }
    y = uy + LINE_GAP_MM;
  }
}

/**
 * Genera un PDF multi-página con el texto completo del acuerdo
 * y, si hay URLs http(s) de adjuntos o ruta externa, un anexo con códigos QR.
 */
export async function downloadTradeAgreementPdf(
  agreement: TradeAgreement,
  catalog?: StoreCatalog | null,
): Promise<void> {
  const qrEntries = collectAgreementQrLinkEntries(agreement);

  let plain = buildTradeAgreementPlainDocument(agreement, catalog);
  if (qrEntries.length > 0) {
    plain +=
      "\n\n(En las páginas siguientes de este archivo se incluyen códigos QR con los mismos enlaces.)\n";
  }

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxW = pageW - margin * 2;
  let y = margin;

  const lines = plain.split(/\n/);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (const paragraph of lines) {
    if (!paragraph.trim()) {
      y += LINE_GAP_MM * 0.4;
      if (y > pageH - margin - 4) {
        doc.addPage();
        y = margin;
      }
      continue;
    }
    const p = paragraph;
    const trimmed = p.trim();
    const isHr =
      /^[-]{32,}$/.test(trimmed) || /^[=]{4,}$/.test(trimmed);
    const isTitle = p.startsWith("ACUERDO COMERCIAL");
    const isSection = p === "MERCANCIAS" || p === "SERVICIOS";
    doc.setFont(
      "helvetica",
      isHr || isTitle || isSection ? "bold" : "normal",
    );
    doc.setFontSize(isTitle ? 13 : 10);
    const wrapped = doc.splitTextToSize(p, maxW) as string[];
    for (const line of wrapped) {
      if (y > pageH - margin - 4) {
        doc.addPage();
        y = margin;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      }
      doc.text(line, margin, y);
      y += LINE_GAP_MM;
    }
  }

  await appendQrAnnexToPdf(doc, qrEntries, margin, pageW, pageH);

  doc.save(safePdfFilename(agreement.title, agreement.issuedAt));
}
