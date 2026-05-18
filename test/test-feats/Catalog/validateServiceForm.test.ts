import { describe, expect, it } from "vitest";
import { validateServiceForm } from "@features/profile/profileStoreFormValidation";
import { makeValidServiceForm } from "@test/Resources/Market/catalog-factories";

describe("validateServiceForm", () => {
  it("accepts valid service", () => {
    expect(validateServiceForm(makeValidServiceForm(), [], [])).toBeNull();
  });

  it("requires tipoServicio", () => {
    expect(
      validateServiceForm(makeValidServiceForm({ tipoServicio: "" }), [], []),
    ).toMatch(/tipo de servicio/i);
  });

  it("requires monedas", () => {
    expect(
      validateServiceForm(makeValidServiceForm({ monedas: [] }), [], []),
    ).toMatch(/moneda/i);
  });
});
