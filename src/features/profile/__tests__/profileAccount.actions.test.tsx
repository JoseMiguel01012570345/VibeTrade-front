import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  mockLogoutWebApp,
  mockNavigate,
} from "@/test/apiMocks";
import { makeSessionUser } from "@/test/profileFactories";
import { renderProfileAccount } from "@/test/renderProfilePage";

describe("profileAccount actions", () => {
  it("opens contacts modal", async () => {
    const { user } = renderProfileAccount({ me: makeSessionUser() });
    await user.click(screen.getByRole("button", { name: /contactos/i }));
    expect(
      screen.getByRole("dialog", { name: /^contactos$/i }),
    ).toBeInTheDocument();
  });

  it("opens payment gateway modal", async () => {
    const { user } = renderProfileAccount({ me: makeSessionUser() });
    await user.click(screen.getByRole("button", { name: /^configurar$/i }));
    expect(
      screen.getByRole("dialog", { name: /pagos \(demo\)/i }),
    ).toBeInTheDocument();
  });

  it("confirms logout and navigates to onboarding", async () => {
    const { user } = renderProfileAccount({ me: makeSessionUser() });
    await user.click(screen.getByRole("button", { name: /cerrar sesión/i }));

    expect(
      screen.getByRole("dialog", { name: /¿cerrar sesión\?/i }),
    ).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole("button", {
      name: /cerrar sesión/i,
    });
    await user.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => {
      expect(mockLogoutWebApp).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/onboarding/phone", {
        replace: true,
      });
    });
  });

  it("cancels logout without calling API", async () => {
    const { user } = renderProfileAccount({ me: makeSessionUser() });
    await user.click(screen.getByRole("button", { name: /cerrar sesión/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(mockLogoutWebApp).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(
      "/onboarding/phone",
      expect.anything(),
    );
  });
});
