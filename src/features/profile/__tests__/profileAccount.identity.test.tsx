import { screen, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import { describe, expect, it } from "vitest";
import {
  mockPatchProfile,
  mockPatchProfileAvatar,
  mockMediaApiUrl,
  mockUploadMedia,
} from "@/test/apiMocks";
import {
  makeSessionUser,
  makeSessionUserJson,
} from "@/test/profileFactories";
import {
  getSaveButtonInField,
  renderProfileAccount,
} from "@/test/renderProfilePage";
import { useAppStore } from "@app/store/useAppStore";

describe("profileAccount identity", () => {
  it("disables name save when unchanged", () => {
    const { container } = renderProfileAccount({
      me: makeSessionUser({ name: "Ana Test" }),
    });
    const saveName = getSaveButtonInField(container, /nombre/i);
    expect(saveName).toBeDisabled();
  });

  it("saves name when changed", async () => {
    mockPatchProfile.mockResolvedValue(
      makeSessionUserJson({ name: "Ana Nueva" }),
    );
    const { container, user } = renderProfileAccount({
      me: makeSessionUser({ name: "Ana Test" }),
    });

    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Ana Nueva");
    const saveName = getSaveButtonInField(container, /nombre/i);
    expect(saveName).not.toBeDisabled();
    await user.click(saveName);

    await waitFor(() => {
      expect(mockPatchProfile).toHaveBeenCalledWith({ name: "Ana Nueva" });
    });
    expect(useAppStore.getState().me.name).toBe("Ana Nueva");
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows error when name save fails", async () => {
    mockPatchProfile.mockRejectedValue(new Error("falló nombre"));
    const { container, user } = renderProfileAccount({
      me: makeSessionUser({ name: "Ana Test" }),
    });

    await user.clear(screen.getByLabelText(/nombre/i));
    await user.type(screen.getByLabelText(/nombre/i), "Otro Nombre");
    await user.click(getSaveButtonInField(container, /nombre/i));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("falló nombre");
    });
  });

  it("rejects invalid email without calling API", async () => {
    const { container, user } = renderProfileAccount({
      me: makeSessionUser({ email: "ana@test.com" }),
    });

    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), "no-es-email");
    await user.click(getSaveButtonInField(container, /email/i));

    expect(mockPatchProfile).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Ingresá un email válido.");
  });

  it("saves valid email when dirty", async () => {
    mockPatchProfile.mockResolvedValue(
      makeSessionUserJson({ email: "nueva@test.com" }),
    );
    const { container, user } = renderProfileAccount({
      me: makeSessionUser({ email: "ana@test.com" }),
    });

    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), "nueva@test.com");
    await user.click(getSaveButtonInField(container, /email/i));

    await waitFor(() => {
      expect(mockPatchProfile).toHaveBeenCalledWith({
        email: "nueva@test.com",
      });
    });
  });

  it("disables avatar save without draft", () => {
    renderProfileAccount({ me: makeSessionUser() });
    expect(
      screen.getByRole("button", { name: /guardar foto/i }),
    ).toBeDisabled();
  });

  it("saves avatar after upload", async () => {
    mockPatchProfileAvatar.mockResolvedValue(
      makeSessionUserJson({ avatarUrl: "/api/v1/media/media-test-1" }),
    );
    const { user } = renderProfileAccount({ me: makeSessionUser() });

    const input = screen.getByLabelText(/subir foto de perfil/i);
    const file = new File(["x"], "pic.png", { type: "image/png" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(mockUploadMedia).toHaveBeenCalled();
    });
    expect(mockMediaApiUrl).toHaveBeenCalledWith("media-test-1");

    const savePhoto = screen.getByRole("button", { name: /guardar foto/i });
    expect(savePhoto).not.toBeDisabled();
    await user.click(savePhoto);

    await waitFor(() => {
      expect(mockPatchProfileAvatar).toHaveBeenCalledWith(
        "/api/v1/media/media-test-1",
      );
    });
  });

  it("discards avatar draft", async () => {
    const { user } = renderProfileAccount({ me: makeSessionUser() });
    const input = screen.getByLabelText(/subir foto de perfil/i);
    await user.upload(input, new File(["x"], "pic.png", { type: "image/png" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /guardar foto/i }),
      ).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: /descartar/i }));
    expect(
      screen.getByRole("button", { name: /guardar foto/i }),
    ).toBeDisabled();
  });
});
