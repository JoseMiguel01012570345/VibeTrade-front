import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChatListPage } from "@features/chat/ChatListPage";
import { seedAppStore } from "@test/Resources/Core/store-builders";
import { makeOffer, makeThread, seedChatThread } from "@test/Resources/Chat/thread-factories";
import { renderWithChatRouter } from "@test/Resources/Chat/render-chat";
import { useMarketStore } from "@app/store/useMarketStore";

describe("ChatListPage search", () => {
  it("filters threads by store name and offer title", async () => {
    seedAppStore({
      isSessionActive: true,
      me: {
        id: "buyer-1",
        name: "Comprador",
        email: "",
        phone: "",
        trustScore: 50,
      },
    });
    seedChatThread(
      makeThread({
        id: "cth_a",
        store: { ...makeThread().store, name: "Tienda Alpha" },
        offerId: "offer-a",
      }),
    );
    seedChatThread(
      makeThread({
        id: "cth_b",
        store: { ...makeThread().store, id: "store-b", name: "Tienda Beta" },
        storeId: "store-b",
        offerId: "offer-b",
      }),
    );
    useMarketStore.setState((s) => ({
      offers: {
        ...s.offers,
        "offer-a": makeOffer({ id: "offer-a", title: "Zapatillas rojas" }),
        "offer-b": makeOffer({ id: "offer-b", title: "Servicio limpieza" }),
      },
    }));

    renderWithChatRouter(<ChatListPage />, { route: "/chat" });
    expect(screen.getByText(/Tienda Alpha/i)).toBeInTheDocument();
    expect(screen.getByText(/Tienda Beta/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/filtrar chats por nombre/i),
      "beta",
    );
    expect(screen.queryByText(/Tienda Alpha/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Tienda Beta/i)).toBeInTheDocument();
  });
});
