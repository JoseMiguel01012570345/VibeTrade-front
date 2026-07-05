import {
  CATALOG_CURRENCY_CODE,
  type StoreProduct,
} from "@features/market/logic/storeCatalogTypes";
import type { StoreCategoryDto } from "@features/market/Dtos/storeCatalogTypes";
import { categoryLabel } from "./productCategoryHelpers";

export function priceToInputValue(price: string | number | null | undefined): string {
  if (price == null) return "";
  const s = String(price).trim().replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? String(n) : s;
}

export function parsePriceInput(raw: string): number {
  const s = raw.trim().replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : Number.NaN;
}

const EXPIRY_PREFIX = "Caduca: ";

export function expiryFromProduct(p: StoreProduct): string {
  const w = (p.warrantyReturn ?? "").trim();
  if (w.startsWith(EXPIRY_PREFIX)) return w.slice(EXPIRY_PREFIX.length).trim();
  return "";
}

export function buildProductInput(args: {
  name: string;
  priceInput: string;
  currencyCode: string;
  desc: string;
  weightOrLiters: string;
  stock: number;
  supplierId: string;
  pendingApproval: boolean;
  published: boolean;
  expiryDate: string;
  categoryId: string;
  subcategoryId: string;
  categories: StoreCategoryDto[];
  photoUrls: string[];
  existing?: StoreProduct;
}): Omit<StoreProduct, "id" | "storeId"> {
  const price = parsePriceInput(args.priceInput);
  const catIds = [args.categoryId, args.subcategoryId].filter(Boolean);
  const legacyCategory = categoryLabel(
    args.categories,
    args.categoryId,
    args.subcategoryId,
  );
  const expiry = args.expiryDate.trim();
  const base = args.existing;
  const currency = args.currencyCode.trim() || CATALOG_CURRENCY_CODE;

  return {
    category: legacyCategory,
    name: args.name.trim(),
    model: args.weightOrLiters.trim(),
    shortDescription: args.desc.trim(),
    mainBenefit: base?.mainBenefit ?? "",
    technicalSpecs: base?.technicalSpecs ?? "",
    condition: base?.condition ?? "nuevo",
    price: Number.isFinite(price) ? String(price) : "",
    monedaPrecio: currency,
    monedas: [currency],
    transportIncluded: base?.transportIncluded,
    taxesShippingInstall: base?.taxesShippingInstall ?? "",
    availability: expiry ? `${EXPIRY_PREFIX}${expiry}` : (base?.availability ?? "En stock"),
    warrantyReturn: expiry ? `${EXPIRY_PREFIX}${expiry}` : (base?.warrantyReturn ?? ""),
    contentIncluded: base?.contentIncluded ?? "",
    usageConditions: base?.usageConditions ?? "",
    photoUrls: args.photoUrls,
    published: args.published,
    stockQuantity: Math.max(0, args.stock),
    pendingApproval: args.pendingApproval,
    supplierId: args.supplierId || null,
    categoryIds: catIds,
    categoryId: args.categoryId || null,
    subcategoryId: args.subcategoryId || null,
    customFields: base?.customFields ?? [],
  };
}

export type ProductFormErrors = Record<string, string>;

export function validateProductModalForm(args: {
  name: string;
  priceInput: string;
  currencyCode: string;
  measureEnabled: boolean;
  measureValue: string;
  stock: number;
  supplierId: string;
  requireSupplier: boolean;
  categoryId: string;
  subcategoryId: string;
  childCategoriesLoading: boolean;
  subcategoryOptionsCount: number;
}): ProductFormErrors {
  const e: ProductFormErrors = {};
  if (!args.name.trim()) e.name = "El nombre es obligatorio.";
  const price = parsePriceInput(args.priceInput);
  if (!Number.isFinite(price) || price <= 0) {
    e.price = "Indica un precio mayor que cero.";
  }
  if (!args.currencyCode.trim()) {
    e.currencyId = "Elige una moneda.";
  }
  if (args.measureEnabled) {
    const v = Number.parseFloat(args.measureValue.trim().replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) {
      e.weight = "Indica una cantidad mayor que cero.";
    }
  }
  if (!Number.isFinite(args.stock) || args.stock < 0) {
    e.stock = "Indica un stock válido (0 o más).";
  }
  if (args.requireSupplier && !args.supplierId) {
    e.supplierId = "Elige un proveedor.";
  }
  if (!args.categoryId.trim()) {
    e.category = "Elige una categoría.";
  } else if (args.childCategoriesLoading) {
    e.subcategory = "Espera a que carguen las subcategorías.";
  } else if (args.subcategoryOptionsCount === 0) {
    e.subcategory =
      "Esta categoría no tiene subcategorías. Créalas abajo o elige otra categoría.";
  } else if (!args.subcategoryId.trim()) {
    e.subcategory = "Elige una subcategoría.";
  }
  return e;
}
