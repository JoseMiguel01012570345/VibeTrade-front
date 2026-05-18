import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VitrinaFiltersCard } from "@features/market/pages/VitrinaFiltersCard";

describe("VitrinaFiltersCard", () => {
  const baseProps = {
    vitrinaListMode: "both" as const,
    onVitrinaListMode: vi.fn(),
    productNameQ: "",
    onProductNameQ: vi.fn(),
    productNameSuggestions: ["Alpha"],
    productCategoryQ: [] as string[],
    onProductCategoryQ: vi.fn(),
    productCategories: ["Electrónica"],
    productCondition: "",
    onProductCondition: vi.fn(),
    serviceNameQ: "",
    onServiceNameQ: vi.fn(),
    serviceNameSuggestions: [],
    serviceCategoryQ: [] as string[],
    onServiceCategoryQ: vi.fn(),
    serviceCategories: ["Servicios"],
    priceSort: "none" as const,
    onPriceSort: vi.fn(),
    priceFloor: null,
    priceCeiling: null,
    onPriceFloor: vi.fn(),
    onPriceCeiling: vi.fn(),
    priceSliderMax: 1000,
    acceptedMonedaQ: [] as string[],
    onAcceptedMonedaQ: vi.fn(),
    acceptedMonedaOptions: ["USD"],
    showPublishedFilter: false,
    catalogPublishedFilter: "all" as const,
    onCatalogPublishedFilter: vi.fn(),
  };

  it("calls onProductNameQ when typing", async () => {
    const onProductNameQ = vi.fn();
    const user = userEvent.setup();
    render(
      <VitrinaFiltersCard {...baseProps} onProductNameQ={onProductNameQ} />,
    );
    const input = screen.getByPlaceholderText(/nombre o modelo/i);
    await user.type(input, "alpha");
    expect(onProductNameQ).toHaveBeenCalled();
  });
});
