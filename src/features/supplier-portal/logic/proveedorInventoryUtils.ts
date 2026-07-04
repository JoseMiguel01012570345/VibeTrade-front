import type { SupplierPortalInventoryRow } from "../Dtos/supplierPortalTypes";
import { downloadExcel } from "./downloadExcel";

/** Columnas del Excel de inventario del portal proveedor (descarga e importación). */
export const PROVEEDOR_INVENTORY_EXCEL_HEADERS = [
  "Id",
  "Nombre",
  "Precio",
  "Moneda",
  "Stock",
] as const;

export async function exportProveedorInventoryExcel(rows: SupplierPortalInventoryRow[]) {
  const headers = [...PROVEEDOR_INVENTORY_EXCEL_HEADERS];
  const data = rows.map((p) => [p.id, p.name, p.price, p.currencyCode, p.stock]);
  await downloadExcel(
    headers,
    data,
    `inventario-${new Date().toISOString().slice(0, 10)}.xlsx`,
    "Inventario",
  );
}
