import "@test/Resources/Market/mocks/setup-profile-stores-section";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ProfileStoresSection } from "@features/profile/ProfileStoresSection";
import { renderWithRouter } from "@test/Resources/Profile/render-profile-section";
import { seedAppStore, seedMarketStore } from "@test/Resources/Core/store-builders";
import { makeSessionUser } from "@test/Resources/Profile/profile-factories";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";

describe("ProfileStoresSection filters", () => {
  beforeEach(() => {
    seedAppStore({
      me: makeSessionUser({ id: "user-test-1" }),
      isSessionActive: true,
    });
    seedMarketStore({
      stores: {
        "store-a": makeStoreBadge({
          id: "store-a",
          name: "Alpha Shop",
          categories: ["Electrónica"],
          ownerUserId: "user-test-1",
          trustScore: 90,
        }),
        "store-b": makeStoreBadge({
          id: "store-b",
          name: "Beta Home",
          categories: ["Hogar"],
          ownerUserId: "user-test-1",
          trustScore: 50,
        }),
      },
    });
  });

  it("filters stores by name", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <ProfileStoresSection ownerUserId="user-test-1" canEdit />,
    );
    const search = screen.getByLabelText(/filtrar tiendas por nombre/i);
    await user.type(search, "alpha");
    expect(screen.getByText(/alpha shop/i)).toBeInTheDocument();
    expect(screen.queryByText(/beta home/i)).not.toBeInTheDocument();
  });
});
