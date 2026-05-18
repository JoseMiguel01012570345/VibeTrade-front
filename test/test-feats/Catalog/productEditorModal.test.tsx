import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { describe, expect, it, vi } from "vitest";
import { ProductEditorModal } from "@features/profile/stores/ProductEditorModal";
import { makeValidProductForm } from "@test/Resources/Market/catalog-factories";

describe("ProductEditorModal", () => {
  it("blocks save when category is missing", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    const initial = makeValidProductForm({ category: "" });
    render(
      <ProductEditorModal
        open
        title="Nuevo producto"
        initial={initial}
        categoryOptions={["Electrónica"]}
        currencyOptions={["USD"]}
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    await user.click(screen.getByRole("button", { name: /guardar producto/i }));
    expect(toast.error).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with valid form", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ProductEditorModal
        open
        title="Nuevo producto"
        initial={makeValidProductForm()}
        categoryOptions={["Electrónica"]}
        currencyOptions={["USD"]}
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    await user.click(screen.getByRole("button", { name: /guardar producto/i }));
    expect(onSave).toHaveBeenCalled();
  });
});
