import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ChatRightRailPeoplePanel } from "@features/chat/components/rail/layout/ChatRightRailPeoplePanel";
import { buildChatParticipants } from "@features/chat/lib/chatParticipants";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";

describe("ChatRightRailPeoplePanel", () => {
  it("renders participant count and trust score", () => {
    const store = makeStoreBadge({ name: "Tienda Demo" });
    const participants = buildChatParticipants(
      { id: "buyer-1", name: "Ana", trustScore: 50 },
      store,
    );
    render(
      <MemoryRouter>
        <ChatRightRailPeoplePanel
          bodyClassName="p-2"
          participants={participants}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Tienda Demo")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
  });
});
