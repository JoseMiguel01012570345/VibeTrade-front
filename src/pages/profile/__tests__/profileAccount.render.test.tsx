import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockFetchPublicProfile } from "../../../testResources/apiMocks";
import {
  makePublicProfile,
  makeSessionUser,
} from "../../../testResources/profileFactories";
import {
  renderProfileAccount,
  renderProfileVisitor,
} from "../../../testResources/renderProfilePage";

describe("profileAccount render", () => {
  it("renders owner account with editable sections", () => {
    renderProfileAccount({ me: makeSessionUser() });

    expect(screen.getByText(/configuración del usuario/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /contactos/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/email/i)).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
  });

  it("renders visitor account as read-only", async () => {
    const visitor = makePublicProfile({
      id: "visitor-user-2",
      name: "Visitante Demo",
    });
    mockFetchPublicProfile.mockResolvedValue(visitor);

    renderProfileVisitor("visitor-user-2", {
      me: makeSessionUser({ id: "user-test-1" }),
    });

    await waitFor(() => {
      expect(mockFetchPublicProfile).toHaveBeenCalledWith("visitor-user-2");
    });

    expect(screen.getByDisplayValue("Visitante Demo")).toBeDisabled();
    const dashes = screen.getAllByDisplayValue("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
    dashes.forEach((el) => expect(el).toBeDisabled());
    expect(
      screen.getByRole("button", { name: /conectar instagram/i }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: /contactos/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cerrar sesión/i }),
    ).not.toBeInTheDocument();
  });
});
