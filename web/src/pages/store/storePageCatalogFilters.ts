import {
  catalogMonedasList,
  type StoreProduct,
  type StoreService,
} from "../chat/domain/storeCatalogTypes";
import {
  matchesCategoryFilter,
  matchesConditionFilter,
  matchesNameQuery,
} from "../../utils/market/nameCategoryFilter";
import {
  compareParsedPricesWithTieBreak,
  parseProductPriceNumber,
  serviceComparablePrice,
} from "../../utils/market/parseProductPrice";
import type { PriceSort } from "./storePageTypes";

/** Minimal shape so callers can pass `StoreSectionFilters` without a circular import. */
type StoreSectionFiltersLike = {
  productNameQ: string;
  productCategoryQ: string;
  productConditionQ: string;
  serviceNameQ: string;
  serviceCategoryQ: string;
  acceptedMonedaQ: string;
};

export type ProductSectionFilterFields = Pick<
  StoreSectionFiltersLike,
  | "productNameQ"
  | "productCategoryQ"
  | "productConditionQ"
  | "acceptedMonedaQ"
>;

export type ServiceSectionFilterFields = Pick<
  StoreSectionFiltersLike,
  "serviceNameQ" | "serviceCategoryQ" | "acceptedMonedaQ"
>;

/** Monedas aceptadas + moneda del precio (si no está ya en la lista). */
export function productCurrencyCodesForFilter(p: StoreProduct): string[] {
  const list = catalogMonedasList(p);
  const mp = p.monedaPrecio?.trim();
  if (!mp) return list;
  const up = mp.toUpperCase();
  if (list.some((c) => c.trim().toUpperCase() === up)) return list;
  return [...list, mp].sort((a, b) => a.localeCompare(b, "es"));
}

function matchesAcceptedMonedaFilter(
  selected: string,
  codes: string[],
): boolean {
  const t = selected.trim();
  if (!t) return true;
  const u = t.toUpperCase();
  return codes.some((c) => c.trim().toUpperCase() === u);
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
    for (const x of catalogMonedasList(s)) {
      const t = x.trim();
      if (t) set.add(t);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

export type PriceRangeSortOpts = {
  sliderMax: number;
  priceFloor: number | null;
  priceCeiling: number | null;
  priceSort: PriceSort;
};

export function filterProductsBySectionText(
  products: StoreProduct[],
  f: ProductSectionFilterFields,
): StoreProduct[] {
  return products.filter(
    (p) =>
      (matchesNameQuery(p.name, f.productNameQ) ||
        matchesNameQuery(p.model ?? "", f.productNameQ)) &&
      matchesCategoryFilter(p.category, f.productCategoryQ) &&
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
      (matchesNameQuery(s.tipoServicio, f.serviceNameQ) ||
        matchesNameQuery(s.descripcion, f.serviceNameQ)) &&
      matchesCategoryFilter(s.category, f.serviceCategoryQ) &&
      matchesAcceptedMonedaFilter(
        f.acceptedMonedaQ,
        catalogMonedasList(s),
      ),
  );
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
            ? a.tipoServicio.localeCompare(b.tipoServicio, "es")
            : b.tipoServicio.localeCompare(a.tipoServicio, "es"),
      ),
    );
  }
  return result;
}
