import { render, type RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { seedAppStore, seedMarketStore } from "./storeBuilders";
import { makeSessionUser } from "./profileFactories";
import type { User } from "../app/store/useAppStore";

export type RenderProfileOptions = {
  route?: string;
  search?: string;
  me?: User;
  isSessionActive?: boolean;
  profileSocialLinks?: Record<string, string | undefined>;
  profileDisplayNames?: Record<string, string>;
  marketStores?: ReturnType<typeof import("../app/store/useMarketStore").useMarketStore.getState>["stores"];
};

function applyStoreSeed(opts: RenderProfileOptions) {
  const me = opts.me ?? makeSessionUser();
  seedAppStore({
    me,
    isSessionActive: opts.isSessionActive ?? true,
    profileSocialLinks: opts.profileSocialLinks,
    profileDisplayNames: opts.profileDisplayNames,
  });
  seedMarketStore({ stores: opts.marketStores ?? {} });
}

function renderAtPath(path: string, opts: RenderProfileOptions = {}) {
  applyStoreSeed(opts);
  const user = userEvent.setup();
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/profile/:userId/:section" element={<ProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
  return { user, ...result };
}

export function renderProfileAccount(
  opts: RenderProfileOptions = {},
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const route = opts.route ?? "/profile/me/account";
  const search = opts.search ?? "";
  return renderAtPath(`${route}${search}`, opts);
}

export function renderProfileVisitor(
  visitorUserId: string,
  opts: RenderProfileOptions = {},
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const section = opts.route?.split("/").pop() ?? "account";
  const path = opts.route ?? `/profile/${visitorUserId}/${section}`;
  const search = opts.search ?? "";
  return renderAtPath(`${path}${search}`, opts);
}

/** Botón Guardar dentro del bloque Nombre o Email (hay varios en la página). */
export function getSaveButtonInField(
  container: HTMLElement,
  fieldLabel: RegExp,
): HTMLButtonElement {
  const labels = Array.from(container.querySelectorAll("label"));
  const label = labels.find((l) => fieldLabel.test(l.textContent ?? ""));
  if (!label) {
    throw new Error(`No label matching ${fieldLabel}`);
  }
  const btn = label.querySelector('button[type="button"]');
  if (!btn || !(btn instanceof HTMLButtonElement)) {
    throw new Error(`No save button in field ${fieldLabel}`);
  }
  return btn;
}
