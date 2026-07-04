import { describe, expect, it } from "vitest";
import type { StoreCategoryDto } from "@features/market/Dtos/storeCatalogTypes";
import {
  depthFromRoot,
  leafDescendantsUnderRoot,
  pickLeafCategoryForProduct,
  rootAncestorId,
} from "@features/storefront/logic/categoryTree/guestCategoryTree";

const categories: StoreCategoryDto[] = [
  { id: "food", name: "Alimentos", parentCategoryId: null },
  { id: "dairy", name: "Lácteos", parentCategoryId: "food" },
  { id: "cheese", name: "Quesos", parentCategoryId: "dairy" },
  { id: "meat", name: "Carnes", parentCategoryId: "food" },
  { id: "tech", name: "Tecnología", parentCategoryId: null },
  { id: "phones", name: "Teléfonos", parentCategoryId: "tech" },
];

describe("guestCategoryTree", () => {
  it("depthFromRoot cuenta niveles desde la raíz", () => {
    expect(depthFromRoot("food", categories)).toBe(0);
    expect(depthFromRoot("dairy", categories)).toBe(1);
    expect(depthFromRoot("cheese", categories)).toBe(2);
  });

  it("rootAncestorId devuelve la raíz del subárbol", () => {
    expect(rootAncestorId("cheese", categories)).toBe("food");
    expect(rootAncestorId("phones", categories)).toBe("tech");
  });

  it("leafDescendantsUnderRoot lista solo hojas bajo una raíz", () => {
    const leaves = leafDescendantsUnderRoot("food", categories);
    expect(leaves.map((c) => c.id).sort()).toEqual(["cheese", "meat"]);
  });

  it("pickLeafCategoryForProduct prefiere la categoría más profunda", () => {
    const leafIds = new Set(["cheese", "meat", "phones"]);
    expect(
      pickLeafCategoryForProduct(["food", "dairy", "cheese"], leafIds, categories),
    ).toBe("cheese");
    expect(pickLeafCategoryForProduct(["food"], leafIds, categories)).toBeNull();
  });
});
