import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";

export function renderWithRouter(
  ui: ReactElement,
  options?: RenderOptions,
) {
  return render(<MemoryRouter>{ui}</MemoryRouter>, options);
}
