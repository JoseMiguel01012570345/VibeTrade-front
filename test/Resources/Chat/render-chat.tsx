import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import type { Thread } from "@app/store/marketStoreTypes";
import { useMarketStore } from "@app/store/useMarketStore";
import { seedAppStore } from "@test/Resources/Core/store-builders";

type Options = {
  thread?: Thread;
  route?: string;
  me?: { id: string; name: string; phone?: string; trustScore?: number };
};

export function seedChatStores(opts: Options = {}) {
  seedAppStore({
    isSessionActive: true,
    me: {
      id: opts.me?.id ?? "buyer-1",
      name: opts.me?.name ?? "Comprador",
      email: "",
      phone: opts.me?.phone ?? "+5491112345678",
      trustScore: opts.me?.trustScore ?? 50,
    },
  });
  if (opts.thread) {
    useMarketStore.setState((s) => ({
      threads: { ...s.threads, [opts.thread!.id]: opts.thread! },
    }));
  }
}

function NavTarget() {
  return <div data-testid="nav-target">profile-or-store</div>;
}

export function renderWithChatRouter(ui: ReactNode, opts: Options = {}) {
  seedChatStores(opts);
  const route = opts.route ?? `/chat/${opts.thread?.id ?? "cth_test_001"}`;
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/chat/:threadId" element={ui} />
        <Route path="/chat" element={ui} />
        <Route path="/profile/:userId/*" element={<NavTarget />} />
        <Route path="/store/:storeId/vitrina" element={<NavTarget />} />
      </Routes>
    </MemoryRouter>,
  );
}
