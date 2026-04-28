import { jsPDF } from "jspdf";
import type { TradeAgreement } from "../domain/tradeAgreementTypes";
import type { StoreCatalog } from "../domain/storeCatalogTypes";
import { buildTradeAgreementPlainDocument } from "./tradeAgreementPdfText";

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

/**
 * Genera un PDF multi-pagina con el texto completo del acuerdo
 * (incluye cabecera: titulo emitido desde tienda, fecha y contenido mercancia/servicio).
 */
export function downloadTradeAgreementPdf(
  agreement: TradeAgreement,
  catalog?: StoreCatalog | null,
): void {
  const plain = buildTradeAgreementPlainDocument(agreement, catalog);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const maxW = pageW - margin * 2;
  const lineGap = 5;
  let y = margin;

  const lines = plain.split(/\n/);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  for (const paragraph of lines) {
    if (!paragraph.trim()) {
      y += lineGap * 0.4;
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
      y += lineGap;
    }
  }

  doc.save(safePdfFilename(agreement.title, agreement.issuedAt));
}
