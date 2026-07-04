import { describe, expect, it } from "vitest";
import type { StoreCategoryDto, StoreProduct } from "@features/market/Dtos/storeCatalogTypes";
import {
  categoryDisplay,
  formatInventoryId,
  isVisibleInStore,
  productStock,
} from "@features/store-admin/logic/inventoryUtils";

function product(overrides: Partial<StoreProduct> = {}): StoreProduct {
  return {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    storeId: "store-1",
    category: "",
    name: "Producto test",
    shortDescription: "",
    mainBenefit: "",
    technicalSpecs: "",
    condition: "nuevo",
    price: "10",
    availability: "",
    warrantyReturn: "",
    contentIncluded: "",
    usageConditions: "",
    photoUrls: [],
    published: true,
    customFields: [],
    ...overrides,
  };
}

const categories: StoreCategoryDto[] = [
  { id: "root-1", name: "Electrónica", parentCategoryId: null },
  { id: "leaf-1", name: "Teléfonos", parentCategoryId: "root-1" },
];

describe("inventoryUtils", () => {
  it("formatInventoryId genera prefijo CXP", () => {
    expect(formatInventoryId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(
      "#CXP-AAAAAA",
    );
  });

  it("isVisibleInStore exige publicado, aprobado y stock", () => {
    expect(isVisibleInStore(product())).toBe(true);
    expect(isVisibleInStore(product({ published: false }))).toBe(false);
    expect(isVisibleInStore(product({ pendingApproval: true }))).toBe(false);
    expect(isVisibleInStore(product({ stockQuantity: 0 }))).toBe(false);
    expect(isVisibleInStore(product({ stockQuantity: null }))).toBe(true);
    expect(isVisibleInStore(product({ stockQuantity: 5 }))).toBe(true);
  });

  it("productStock devuelve 0 cuando falta stockQuantity", () => {
    expect(productStock(product())).toBe(0);
    expect(productStock(product({ stockQuantity: 12 }))).toBe(12);
  });

  it("categoryDisplay muestra jerarquía padre › hijo", () => {
    expect(
      categoryDisplay(
        product({ categoryId: "root-1", subcategoryId: "leaf-1" }),
        categories,
      ),
    ).toBe("Electrónica › Teléfonos");
    expect(
      categoryDisplay(product({ categoryIds: ["leaf-1"] }), categories),
    ).toBe("Teléfonos");
    expect(categoryDisplay(product({ category: "Legacy" }), categories)).toBe(
      "Legacy",
    );
  });
});
