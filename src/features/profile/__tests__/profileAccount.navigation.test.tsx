import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  mockFetchPublicProfile,
  mockNavigate,
} from "@/test/apiMocks";
import {
  makePublicProfile,
  makeSessionUser,
} from "@/test/profileFactories";
import {
  renderProfileAccount,
  renderProfileVisitor,
} from "@/test/renderProfilePage";

describe("profileAccount navigation", () => {
  it("redirects invalid section to account", async () => {
    renderProfileAccount({
      route: "/profile/me/not-a-tab",
      me: makeSessionUser(),
    });

    await waitFor(() => {
      expect(
        screen.getByText(/configuración del usuario/i),
      ).toBeInTheDocument();
    });
  });

  it("redirects visitor away from reels tab", async () => {
    mockFetchPublicProfile.mockResolvedValue(
      makePublicProfile({ id: "visitor-user-2" }),
    );

    renderProfileVisitor("visitor-user-2", {
      route: "/profile/visitor-user-2/reels",
      me: makeSessionUser(),
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/profile/visitor-user-2/account",
        {
          replace: true,
        },
      );
    });
  });

  it("opens payments modal from stripeCards query", async () => {
    renderProfileAccount({
      me: makeSessionUser(),
      search: "?stripeCards=1",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: /pagos \(demo\)/i }),
      ).toBeInTheDocument();
    });
  });
});
