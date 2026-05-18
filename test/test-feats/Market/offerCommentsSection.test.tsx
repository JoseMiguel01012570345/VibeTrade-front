import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockToggleOfferQaCommentLike } from "@test/Resources/Core/api-mocks";
import { renderOfferCommentsSection } from "@test/Resources/Market/render-offer-comments";

describe("OfferCommentsSection", () => {
  it("submits a top-level comment", async () => {
    const { submitOfferQuestion } = renderOfferCommentsSection();
    const user = userEvent.setup();
    const input = screen.getByPlaceholderText(/escribe un comentario/i);
    await user.type(input, "Me interesa");
    await user.click(screen.getByRole("button", { name: /enviar/i }));
    await waitFor(() => {
      expect(submitOfferQuestion).toHaveBeenCalledWith(
        "offer-cmt",
        expect.objectContaining({ id: "buyer-1" }),
        "Me interesa",
        { parentId: null },
      );
    });
  });

  it("replies to a comment", async () => {
    const { submitOfferQuestion } = renderOfferCommentsSection();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^responder$/i }));
    const input = screen.getByPlaceholderText(/escribe una respuesta/i);
    await user.type(input, "Sí, a todo el país");
    await user.click(screen.getByRole("button", { name: /enviar/i }));
    await waitFor(() => {
      expect(submitOfferQuestion).toHaveBeenCalledWith(
        "offer-cmt",
        expect.any(Object),
        "Sí, a todo el país",
        { parentId: "cmt-1" },
      );
    });
  });

  it("likes a comment", async () => {
    const { refreshMock } = renderOfferCommentsSection();
    const user = userEvent.setup();
    await user.click(screen.getByTitle(/me gusta/i));
    await waitFor(() => {
      expect(mockToggleOfferQaCommentLike).toHaveBeenCalledWith(
        "offer-cmt",
        "cmt-1",
      );
      expect(refreshMock).toHaveBeenCalledWith("offer-cmt");
    });
  });
});
