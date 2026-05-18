import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { StorePage } from "@features/market/pages/StorePage";
import {
  seedAppStore,
  seedStoreWithCatalog,
} from "@test/Resources/Core/store-builders";
import { makeSessionUser } from "@test/Resources/Profile/profile-factories";
import { makeStoreCatalog } from "@test/Resources/Market/catalog-factories";
import { makeStoreBadge } from "@test/Resources/Market/store-factories";
import type { StoreCatalog } from "@features/market/model/storeCatalogTypes";

export type RenderStorePageOptions = {
  storeId?: string;
  path?: string;
  ownerUserId?: string;
  /** Usuario que navega la página (por defecto = ownerUserId). */
  viewerUserId?: string;
  catalog?: StoreCatalog;
};

export function renderStorePage(opts: RenderStorePageOptions = {}) {
  const storeId = opts.storeId ?? "store-1";
  const ownerUserId = opts.ownerUserId ?? "user-test-1";
  const viewerUserId = opts.viewerUserId ?? ownerUserId;
  const path = opts.path ?? `/store/${storeId}/vitrina`;

  seedAppStore({
    me: makeSessionUser({ id: viewerUserId }),
    isSessionActive: true,
  });

  const catalog = opts.catalog ?? makeStoreCatalog();
  seedStoreWithCatalog(
    storeId,
    catalog,
    makeStoreBadge({ id: storeId, ownerUserId }),
  );

  const user = userEvent.setup();
  const result = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/store/:storeId" element={<StorePage />} />
        <Route path="/store/:storeId/vitrina" element={<StorePage />} />
        <Route path="/store/:storeId/products" element={<StorePage />} />
        <Route path="/store/:storeId/services" element={<StorePage />} />
      </Routes>
    </MemoryRouter>,
  );
  return { user, storeId, ...result };
}
