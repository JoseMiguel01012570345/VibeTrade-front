import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ProductDetailCard } from "@features/market/pages/ProductDetailCard";
import { makeStoreProduct } from "@test/Resources/Market/catalog-factories";

describe("ProductDetailCard", () => {
  it("shows comment and like counts", () => {
    const p = makeStoreProduct({
      id: "prod-99",
      publicCommentCount: 12,
      offerLikeCount: 34,
    });
    render(
      <MemoryRouter>
        <ProductDetailCard p={p} />
      </MemoryRouter>,
    );
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /12/i })).toHaveAttribute(
      "href",
      "/offer/prod-99#offer-comments",
    );
  });

  it("shows zero counts when missing", () => {
    const p = makeStoreProduct({
      publicCommentCount: undefined,
      offerLikeCount: undefined,
    });
    render(
      <MemoryRouter>
        <ProductDetailCard p={p} />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
  });
});
