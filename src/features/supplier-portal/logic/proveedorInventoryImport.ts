import readXlsxFile from "read-excel-file/browser";
import { bulkUpdateSupplierPortalInventory } from "../api/supplierPortalApi";
import { PROVEEDOR_INVENTORY_EXCEL_HEADERS } from "./proveedorInventoryUtils";

export type ProveedorInventoryImportRow = {
  id: string;
  price: number;
  currencyCode: string;
  stock: number;
};

export type ProveedorInventoryParseResult =
  | { ok: true; rows: ProveedorInventoryImportRow[] }
  | { ok: false; message: string };

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function readCell(row: unknown[], index: number): unknown {
  return index >= 0 && index < row.length ? row[index] : undefined;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim().replace(",", ".");
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function parseInteger(value: unknown): number | null {
  const n = parseNumber(value);
  if (n == null) return null;
  if (!Number.isInteger(n)) return null;
  return n;
}

function parseGuid(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return raw.toLowerCase();
  }
  return null;
}

export async function parseProveedorInventoryExcel(
  file: File,
): Promise<ProveedorInventoryParseResult> {
  const rows = await readXlsxFile(file);
  if (rows.length < 2) {
    return { ok: false, message: "El archivo no contiene filas de datos." };
  }

  const headerRow = rows[0] ?? [];
  const expected = PROVEEDOR_INVENTORY_EXCEL_HEADERS.map((h) => normalizeHeader(h));
  const headerMap = new Map<string, number>();
  headerRow.forEach((cell: unknown, index: number) => {
    const key = normalizeHeader(cell);
    if (key) headerMap.set(key, index);
  });

  for (const label of expected) {
    if (!headerMap.has(label)) {
      return {
        ok: false,
        message: `Falta la columna "${label.charAt(0).toUpperCase()}${label.slice(1)}". Usa el mismo formato que la exportación.`,
      };
    }
  }

  const idIdx = headerMap.get("id")!;
  const priceIdx = headerMap.get("precio")!;
  const currencyIdx = headerMap.get("moneda")!;
  const stockIdx = headerMap.get("stock")!;

  const parsed: ProveedorInventoryImportRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const id = parseGuid(readCell(row, idIdx));
    const price = parseNumber(readCell(row, priceIdx));
    const currencyCode = String(readCell(row, currencyIdx) ?? "").trim().toUpperCase();
    const stock = parseInteger(readCell(row, stockIdx));

    const hasAnyValue =
      (readCell(row, idIdx) != null && String(readCell(row, idIdx)).trim() !== "") ||
      (readCell(row, priceIdx) != null && String(readCell(row, priceIdx)).trim() !== "") ||
      (readCell(row, currencyIdx) != null && String(readCell(row, currencyIdx)).trim() !== "") ||
      (readCell(row, stockIdx) != null && String(readCell(row, stockIdx)).trim() !== "");

    if (!hasAnyValue) continue;

    const rowNum = i + 1;
    if (!id) {
      return { ok: false, message: `Fila ${rowNum}: el Id no es válido.` };
    }
    if (price == null || price < 0) {
      return { ok: false, message: `Fila ${rowNum}: el Precio no es válido.` };
    }
    if (!currencyCode) {
      return { ok: false, message: `Fila ${rowNum}: indica la Moneda.` };
    }
    if (stock == null || stock < 0) {
      return { ok: false, message: `Fila ${rowNum}: el Stock no es válido.` };
    }

    parsed.push({ id, price, currencyCode, stock });
  }

  if (parsed.length === 0) {
    return { ok: false, message: "No hay filas con datos para importar." };
  }

  return { ok: true, rows: parsed };
}

export async function importProveedorInventoryExcel(rows: ProveedorInventoryImportRow[]) {
  return bulkUpdateSupplierPortalInventory(
    rows.map((r) => ({
      id: r.id,
      stock: r.stock,
    })),
  );
}
