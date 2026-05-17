import { screen, waitFor, within } from "@testing-library/react";
import toast from "react-hot-toast";
import { describe, expect, it } from "vitest";
import { mockPatchProfile } from "../../../testResources/apiMocks";
import {
  makeSessionUser,
  makeSessionUserJson,
} from "../../../testResources/profileFactories";
import { renderProfileAccount } from "../../../testResources/renderProfilePage";

describe("profileAccount social links", () => {
  it("opens instagram modal", async () => {
    const { user } = renderProfileAccount({ me: makeSessionUser() });
    await user.click(
      screen.getByRole("button", { name: /conectar instagram/i }),
    );

    expect(
      screen.getByRole("dialog", { name: /conectar instagram/i }),
    ).toBeInTheDocument();
  });

  it("preloads existing social value", async () => {
    const { user } = renderProfileAccount({
      me: makeSessionUser(),
      profileSocialLinks: { instagram: "@empresa" },
    });

    await user.click(screen.getByRole("button", { name: /editar/i }));
    expect(screen.getByDisplayValue("@empresa")).toBeInTheDocument();
  });

  it("saves instagram link", async () => {
    mockPatchProfile.mockResolvedValue(
      makeSessionUserJson({ instagram: "@nueva" }),
    );
    const { user } = renderProfileAccount({ me: makeSessionUser() });

    await user.click(
      screen.getByRole("button", { name: /conectar instagram/i }),
    );
    const input = screen.getByPlaceholderText(/@mi_empresa/i);
    await user.clear(input);
    await user.type(input, "@nueva");
    const dialog = screen.getByRole("dialog", { name: /conectar instagram/i });
    await user.click(
      within(dialog).getByRole("button", { name: /^guardar$/i }),
    );

    await waitFor(() => {
      expect(mockPatchProfile).toHaveBeenCalledWith({ instagram: "@nueva" });
    });
    expect(
      screen.queryByRole("dialog", { name: /conectar instagram/i }),
    ).not.toBeInTheDocument();
  });

  it("saves x link as xAccount", async () => {
    mockPatchProfile.mockResolvedValue(
      makeSessionUserJson({ xAccount: "@empresa" }),
    );
    const { user } = renderProfileAccount({ me: makeSessionUser() });

    await user.click(screen.getByRole("button", { name: /conectar x/i }));
    await user.type(screen.getByPlaceholderText(/@empresa/i), "@empresa");
    const dialog = screen.getByRole("dialog", { name: /conectar x/i });
    await user.click(
      within(dialog).getByRole("button", { name: /^guardar$/i }),
    );

    await waitFor(() => {
      expect(mockPatchProfile).toHaveBeenCalledWith({ xAccount: "@empresa" });
    });
  });

  it("shows toast on social save error", async () => {
    mockPatchProfile.mockRejectedValue(new Error("red social falló"));
    const { user } = renderProfileAccount({ me: makeSessionUser() });

    await user.click(
      screen.getByRole("button", { name: /conectar telegram/i }),
    );
    const dialog = screen.getByRole("dialog", { name: /conectar telegram/i });
    await user.click(
      within(dialog).getByRole("button", { name: /^guardar$/i }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("red social falló");
    });
  });
});
