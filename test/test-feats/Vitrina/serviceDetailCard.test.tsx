import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ServiceDetailCard } from "@features/market/pages/ServiceDetailCard";
import { makeStoreService } from "@test/Resources/Market/catalog-factories";

describe("ServiceDetailCard", () => {
  it("shows engagement metrics", () => {
    const s = makeStoreService({
      id: "svc-42",
      publicCommentCount: 8,
      offerLikeCount: 15,
    });
    render(
      <MemoryRouter>
        <ServiceDetailCard s={s} />
      </MemoryRouter>,
    );
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/offer/svc-42#offer-comments");
  });
});
