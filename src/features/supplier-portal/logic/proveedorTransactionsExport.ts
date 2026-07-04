import type { SupplierPortalTransactionRow } from "../Dtos/supplierPortalTypes";
import { ORDER_STATUS_LABELS } from "./proveedorSectionConstants";
import { downloadExcel } from "./downloadExcel";

function formatExportDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function statusLabel(status: number) {
  const safe = Number.isInteger(status) && status >= 0 ? status : 0;
  return ORDER_STATUS_LABELS[safe] ?? `Estado ${safe}`;
}

export async function exportProveedorTransactionsExcel(
  rows: SupplierPortalTransactionRow[],
) {
  const headers = [
    "Fecha",
    "Número de factura",
    "Cliente",
    "Items",
    "Total",
    "Moneda",
    "Estado",
  ];
  const data = rows.map((row) => {
    if (row.kind === "platformDebt") {
      return [
        formatExportDate(row.createdAt),
        row.publicNumber,
        row.customerName || "BanderaExpress",
        "—",
        row.total,
        row.currencyCode,
        "Deuda plataforma",
        row.platformDebtAmountAfter ?? "",
      ];
    }
    return [
      formatExportDate(row.createdAt),
      row.publicNumber,
      row.customerName || "—",
      row.itemCount,
      row.total,
      row.currencyCode,
      statusLabel(row.status),
      "",
    ];
  });
  await downloadExcel(
    [...headers, "Fondos actualizados"],
    data,
    `pedidos-${new Date().toISOString().slice(0, 10)}.xlsx`,
    "Pedidos",
  );
}
