import {
  CATALOG_CURRENCY_CODE,
  type StoreProduct,
  type StoreService,
} from "@features/market/logic/storeCatalogTypes";
import {
  matchesCategoryFilter,
  matchesConditionFilter,
  matchesNameQuery,
} from "@features/market/logic/nameCategoryFilter";
import {
  compareParsedPricesWithTieBreak,
  parseProductPriceNumber,
  serviceComparablePrice,
} from "@features/market/logic/parseProductPrice";
import type { CatalogPublishedFilter } from "../Dtos/storePageTypes";

export type {
  ProductSectionFilterFields,
  ServiceSectionFilterFields,
  PriceRangeSortOpts,
} from "../Dtos/storePageCatalogFiltersTypes";
import type {
  PriceRangeSortOpts,
  ProductSectionFilterFields,
  ServiceSectionFilterFields,
} from "../Dtos/storePageCatalogFiltersTypes";

export function isStoreProductPublished(p: StoreProduct): boolean {
  return p.published === true;
}

export function isStoreServicePublished(s: StoreService): boolean {
  return s.published !== false;
}

function matchesCatalogPublishedFilter(
  mode: CatalogPublishedFilter,
  isPublished: boolean,
): boolean {
  if (mode === "all") return true;
  if (mode === "published") return isPublished;
  return !isPublished;
}

export function productCurrencyCodesForFilter(_p: StoreProduct): string[] {
  return [CATALOG_CURRENCY_CODE];
}

function matchesAcceptedMonedaFilter(
  selected: readonly string[],
  codes: string[],
): boolean {
  if (selected.length === 0) return true;
  const wanted = new Set(
    selected.map((s) => s.trim().toUpperCase()).filter(Boolean),
  );
  if (wanted.size === 0) return true;
  return codes.some((c) => wanted.has(c.trim().toUpperCase()));
}

export function serviceCurrencyCodesForFilter(_s: StoreService): string[] {
  return [CATALOG_CURRENCY_CODE];
}

/** Códigos únicos para el select (hints del API + catálogo). */
export function collectCurrencyCodesForFilterOptions(
  currencyHints: string[],
  products: StoreProduct[],
  services: StoreService[],
): string[] {
  const set = new Set<string>();
  for (const c of currencyHints) {
    const x = c.trim();
    if (x) set.add(x);
  }
  for (const p of products) {
    for (const x of productCurrencyCodesForFilter(p)) {
      const t = x.trim();
      if (t) set.add(t);
    }
  }
  for (const s of services) {
    for (const x of serviceCurrencyCodesForFilter(s)) {
      const t = x.trim();
      if (t) set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export function filterProductsBySectionText(
  products: StoreProduct[],
  f: ProductSectionFilterFields,
): StoreProduct[] {
  return products.filter(
    (p) =>
      matchesCatalogPublishedFilter(
        f.catalogPublishedFilter,
        isStoreProductPublished(p),
      ) &&
      (matchesNameQuery(p.name, f.productNameQ) ||
        matchesNameQuery(p.model ?? "", f.productNameQ)) &&
      matchesAnyCategoryFilter(p.category, f.productCategoryQ) &&
      matchesConditionFilter(p.condition, f.productConditionQ) &&
      matchesAcceptedMonedaFilter(
        f.acceptedMonedaQ,
        productCurrencyCodesForFilter(p),
      ),
  );
}

export function filterServicesBySectionText(
  services: StoreService[],
  f: ServiceSectionFilterFields,
): StoreService[] {
  return services.filter(
    (s) =>
      matchesCatalogPublishedFilter(
        f.catalogPublishedFilter,
        isStoreServicePublished(s),
      ) &&
      (matchesNameQuery(s.nombreServicio, f.serviceNameQ) ||
        matchesNameQuery(s.descripcion, f.serviceNameQ)) &&
      matchesAnyCategoryFilter(s.category, f.serviceCategoryQ) &&
      matchesAcceptedMonedaFilter(
        f.acceptedMonedaQ,
        serviceCurrencyCodesForFilter(s),
      ),
  );
}

function matchesAnyCategoryFilter(
  itemCategory: string,
  selected: readonly string[],
): boolean {
  if (selected.length === 0) return true;
  for (const s of selected) {
    if (matchesCategoryFilter(itemCategory, s)) return true;
  }
  return false;
}

export function applyProductPriceRangeAndSort(
  list: StoreProduct[],
  opts: PriceRangeSortOpts,
): StoreProduct[] {
  let result = list;
  const floor = opts.priceFloor ?? 0;
  const cap = opts.priceCeiling ?? opts.sliderMax;
  if (opts.sliderMax > 0) {
    result = result.filter((p) => {
      const n = parseProductPriceNumber(p.price);
      if (n == null) return true;
      return n >= floor && n <= cap;
    });
  }
  if (opts.priceSort === "asc" || opts.priceSort === "desc") {
    const order = opts.priceSort;
    result = [...result].sort((a, b) =>
      compareParsedPricesWithTieBreak(
        parseProductPriceNumber(a.price),
        parseProductPriceNumber(b.price),
        order,
        () =>
          order === "asc"
            ? a.name.localeCompare(b.name, "es")
            : b.name.localeCompare(a.name, "es"),
      ),
    );
  }
  return result;
}

export function applyServicePriceRangeAndSort(
  list: StoreService[],
  opts: PriceRangeSortOpts,
): StoreService[] {
  let result = list;
  const floor = opts.priceFloor ?? 0;
  const cap = opts.priceCeiling ?? opts.sliderMax;
  if (opts.sliderMax > 0) {
    result = result.filter((s) => {
      const n = serviceComparablePrice(s);
      if (n == null) return true;
      return n >= floor && n <= cap;
    });
  }
  if (opts.priceSort === "asc" || opts.priceSort === "desc") {
    const order = opts.priceSort;
    result = [...result].sort((a, b) =>
      compareParsedPricesWithTieBreak(
        serviceComparablePrice(a),
        serviceComparablePrice(b),
        order,
        () =>
          order === "asc"
            ? a.nombreServicio.localeCompare(b.nombreServicio, "es")
            : b.nombreServicio.localeCompare(a.nombreServicio, "es"),
      ),
    );
  }
  return result;
}
