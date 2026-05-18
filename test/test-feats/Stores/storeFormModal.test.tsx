import "@test/Resources/Market/mocks/setup-store-location-map-modal";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { describe, expect, it, vi } from "vitest";
import { StoreFormModal } from "@features/profile/stores/StoreFormModal";
import { makeOwnerStoreFormValues } from "@test/Resources/Market/store-factories";

describe("StoreFormModal", () => {
  it("blocks save when name is empty", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <StoreFormModal
        open
        title="Nueva tienda"
        initial={makeOwnerStoreFormValues({ name: "" })}
        categoryOptions={["Electrónica"]}
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(toast.error).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with valid values", async () => {
    const initial = makeOwnerStoreFormValues();
    const onSave = vi.fn().mockReturnValue(true);
    const user = userEvent.setup();
    render(
      <StoreFormModal
        open
        title="Nueva tienda"
        initial={initial}
        categoryOptions={["Electrónica", "Hogar"]}
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    await user.clear(screen.getByLabelText(/nombre de la tienda/i));
    await user.type(screen.getByLabelText(/nombre de la tienda/i), "Mi Tienda");
    await user.click(screen.getByRole("button", { name: /guardar/i }));
    expect(onSave).toHaveBeenCalled();
    const saved = onSave.mock.calls[0][0];
    expect(saved.name).toBe("Mi Tienda");
  });
});
