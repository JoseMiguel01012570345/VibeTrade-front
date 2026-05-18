import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CatalogSearchPage } from "@features/catalog/pages/CatalogSearchPage";

export function renderCatalogSearch(path = "/search") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/search" element={<CatalogSearchPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

export async function submitCatalogSearch(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(screen.getByRole("button", { name: /buscar/i }));
}
