import { describe, expect, it } from "vitest";
import { validateProductForm } from "@features/profile/profileStoreFormValidation";
import { makeValidProductForm } from "@test/Resources/Market/catalog-factories";

describe("validateProductForm", () => {
  it("accepts valid product", () => {
    expect(validateProductForm(makeValidProductForm())).toBeNull();
  });

  it("requires category", () => {
    expect(validateProductForm(makeValidProductForm({ category: "" }))).toMatch(
      /categoría/i,
    );
  });

  it("requires transportIncluded choice", () => {
    expect(
      validateProductForm(makeValidProductForm({ transportIncluded: undefined })),
    ).toMatch(/transporte/i);
  });

  it("requires at least one photo", () => {
    expect(
      validateProductForm(makeValidProductForm({ photoUrls: [] })),
    ).toMatch(/foto/i);
  });
});
