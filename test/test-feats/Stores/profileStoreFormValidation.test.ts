import { describe, expect, it } from "vitest";
import { validateOwnerStoreForm } from "@features/profile/profileStoreFormValidation";
import { makeOwnerStoreFormValues } from "@test/Resources/Market/store-factories";

describe("validateOwnerStoreForm", () => {
  it("accepts valid store form", () => {
    expect(validateOwnerStoreForm(makeOwnerStoreFormValues())).toBeNull();
  });

  it("requires store name", () => {
    expect(
      validateOwnerStoreForm(makeOwnerStoreFormValues({ name: "" })),
    ).toMatch(/nombre de la tienda/i);
  });

  it("requires meaningful categories", () => {
    expect(
      validateOwnerStoreForm(makeOwnerStoreFormValues({ categories: [] })),
    ).toMatch(/categoría/i);
  });

  it("requires category pitch length", () => {
    expect(
      validateOwnerStoreForm(makeOwnerStoreFormValues({ categoryPitch: "" })),
    ).toMatch(/descripción de categorías/i);
  });

  it("rejects invalid website url", () => {
    expect(
      validateOwnerStoreForm(
        makeOwnerStoreFormValues({ websiteUrl: "not a url!!!" }),
      ),
    ).toMatch(/url del sitio/i);
  });

  it("accepts website without scheme", () => {
    expect(
      validateOwnerStoreForm(
        makeOwnerStoreFormValues({ websiteUrl: "mitienda.com" }),
      ),
    ).toBeNull();
  });
});
