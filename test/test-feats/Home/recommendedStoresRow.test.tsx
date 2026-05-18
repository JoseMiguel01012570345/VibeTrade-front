import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RecommendedStoresRow } from "@features/home/RecommendedStoresRow";
import { mockNavigate } from "@test/Resources/Core/api-mocks";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";

describe("RecommendedStoresRow", () => {
  it("navigates to store page when clicking a store card", async () => {
    const store = makeStoreBadge({ id: "store-rec-1", name: "Tienda Beta" });
    render(
      <RecommendedStoresRow
        storeIds={[store.id]}
        stores={{ [store.id]: store }}
        storeCatalogs={{}}
      />,
    );
    expect(screen.getByText("Tienda Beta")).toBeInTheDocument();
    const user = userEvent.setup();
    const card = screen.getByText("Tienda Beta").closest('[role="link"]');
    expect(card).not.toBeNull();
    await user.click(card!);
    expect(mockNavigate).toHaveBeenCalledWith("/store/store-rec-1");
  });
});
