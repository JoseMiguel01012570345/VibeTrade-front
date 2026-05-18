import { describe, expect, it } from "vitest";
import {
  filterProductsBySectionText,
  filterServicesBySectionText,
  isStoreProductPublished,
  isStoreServicePublished,
} from "@features/market/pages/storePageCatalogFilters";
import {
  makeStoreProduct,
  makeStoreService,
} from "@test/Resources/Market/catalog-factories";

describe("storePageCatalogFilters", () => {
  const products = [
    makeStoreProduct({ id: "p1", name: "Alpha Phone", category: "Electrónica", published: true }),
    makeStoreProduct({ id: "p2", name: "Beta Chair", category: "Hogar", published: false }),
  ];
  const services = [
    makeStoreService({ id: "s1", tipoServicio: "Consultoría IT", published: true }),
    makeStoreService({
      id: "s2",
      tipoServicio: "Limpieza",
      descripcion: "Servicio de limpieza general.",
      published: false,
    }),
  ];

  it("detects published state", () => {
    expect(isStoreProductPublished(products[0])).toBe(true);
    expect(isStoreProductPublished(products[1])).toBe(false);
    expect(isStoreServicePublished(services[0])).toBe(true);
    expect(isStoreServicePublished(services[1])).toBe(false);
  });

  it("filters products by name", () => {
    const out = filterProductsBySectionText(products, {
      productNameQ: "alpha",
      productCategoryQ: [],
      productConditionQ: "",
      acceptedMonedaQ: [],
      catalogPublishedFilter: "all",
    });
    expect(out.map((p) => p.id)).toEqual(["p1"]);
  });

  it("filters products by published only", () => {
    const out = filterProductsBySectionText(products, {
      productNameQ: "",
      productCategoryQ: [],
      productConditionQ: "",
      acceptedMonedaQ: [],
      catalogPublishedFilter: "published",
    });
    expect(out.map((p) => p.id)).toEqual(["p1"]);
  });

  it("filters services by name", () => {
    const out = filterServicesBySectionText(services, {
      serviceNameQ: "consultoría",
      serviceCategoryQ: [],
      acceptedMonedaQ: [],
      catalogPublishedFilter: "all",
    });
    expect(out.map((s) => s.id)).toEqual(["s1"]);
  });
});
