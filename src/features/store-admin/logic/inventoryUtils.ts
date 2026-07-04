import writeXlsxFile from "write-excel-file/browser";
import type {
  StoreCategoryDto,
  StoreProduct,
  StoreSupplierDto,
} from "@features/market/Dtos/storeCatalogTypes";
import { catalogDisplayPriceUsd } from "@features/market/logic/storeCatalogTypes";

export function formatInventoryId(id: string): string {
  const compact = id.replace(/-/g, "").slice(0, 6).toUpperCase();
  return `#CXP-${compact}`;
}

export function formatWhen(iso: string, invalid = "—"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return invalid;
  const datePart = new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${datePart}, ${timePart}`;
}

/** Visible en el catálogo público (publicado, aprobado y con stock). */
export function isVisibleInStore(product: StoreProduct): boolean {
  if (!product.published || product.pendingApproval) return false;
  if (product.stockQuantity == null) return true;
  return product.stockQuantity > 0;
}

export function productStock(product: StoreProduct): number {
  if (typeof product.stockQuantity === "number") return product.stockQuantity;
  return 0;
}

function categoryName(ids: string[], categories: StoreCategoryDto[]): string {
  const id = ids[0];
  if (!id) return "—";
  return categories.find((c) => c.id === id)?.name ?? "—";
}

export function categoryDisplay(
  product: StoreProduct,
  categories: StoreCategoryDto[],
): string {
  const main = product.categoryId
    ? categories.find((c) => c.id === product.categoryId)
    : undefined;
  const sub = product.subcategoryId
    ? categories.find((c) => c.id === product.subcategoryId)
    : undefined;
  if (main && sub) return `${main.name} › ${sub.name}`;
  if (main && !product.subcategoryId) return main.name;
  if (product.categoryIds?.length) {
    return categoryName(product.categoryIds, categories);
  }
  const legacy = product.category?.trim();
  return legacy || "—";
}

export async function exportInventoryExcel(
  rows: StoreProduct[],
  categories: StoreCategoryDto[],
  suppliers: StoreSupplierDto[],
): Promise<void> {
  const headers = [
    "Nombre",
    "ID",
    "Categoría",
    "Precio",
    "Stock",
    "Proveedor",
    "Catálogo",
    "Pendiente aprobación",
  ];
  const data = rows.map((p) => {
    const supplier =
      suppliers.find((s) => s.id === p.supplierId)?.businessName ?? "";
    const cat = categoryDisplay(p, categories);
    let catalog: string;
    if (isVisibleInStore(p)) catalog = "Sí";
    else if (!p.pendingApproval && !p.published) catalog = "No";
    else catalog = "—";
    return [
      p.name,
      p.id,
      cat,
      catalogDisplayPriceUsd(p.price),
      productStock(p),
      supplier,
      catalog,
      p.pendingApproval ? "Sí" : "No",
    ];
  });
  const filename = `inventario-${new Date().toISOString().slice(0, 10)}.xlsx`;
  await writeXlsxFile([headers, ...data], { sheet: "Inventario" }).toFile(
    filename,
  );
}
