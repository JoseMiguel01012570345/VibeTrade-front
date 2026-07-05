import { parseProductPriceNumber } from "@features/market/logic/parseProductPrice";
import type {
  StoreProduct,
  StoreService,
} from "@features/market/logic/storeCatalogTypes";
import { normalizeStoreService } from "@features/market/logic/storeCatalogTypes";
import type { SortMode } from "./storefrontTypes";

export function decodeCategoryParam(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function sortStoreProducts(
  products: StoreProduct[],
  sort: SortMode,
): StoreProduct[] {
  const copy = [...products];
  if (sort === "price-asc") {
    copy.sort(
      (a, b) =>
        (parseProductPriceNumber(a.price) ?? Number.POSITIVE_INFINITY) -
        (parseProductPriceNumber(b.price) ?? Number.POSITIVE_INFINITY),
    );
  } else if (sort === "price-desc") {
    copy.sort(
      (a, b) =>
        (parseProductPriceNumber(b.price) ?? Number.NEGATIVE_INFINITY) -
        (parseProductPriceNumber(a.price) ?? Number.NEGATIVE_INFINITY),
    );
  } else if (sort === "name-desc") {
    copy.sort((a, b) => b.name.localeCompare(a.name, "es"));
  } else {
    copy.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  return copy;
}

function serviceTitle(s: StoreService): string {
  const n = normalizeStoreService(s);
  return n.nombreServicio || n.category || "Servicio";
}

export function sortStoreServices(
  services: StoreService[],
  sort: SortMode,
): StoreService[] {
  const copy = [...services];
  if (sort === "name-desc") {
    copy.sort((a, b) => serviceTitle(b).localeCompare(serviceTitle(a), "es"));
  } else {
    copy.sort((a, b) => serviceTitle(a).localeCompare(serviceTitle(b), "es"));
  }
  return copy;
}

export const PRODUCT_SORTS: { value: SortMode; label: string }[] = [
  { value: "price-asc", label: "Precio : Menor a Mayor" },
  { value: "price-desc", label: "Precio : Mayor a Menor" },
  { value: "name-asc", label: "Nombre : A-Z" },
];

export const SERVICE_SORTS: { value: SortMode; label: string }[] = [
  { value: "name-asc", label: "Nombre : A-Z" },
  { value: "name-desc", label: "Nombre : Z-A" },
];
