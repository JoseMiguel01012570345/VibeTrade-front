import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { describe, expect, it, vi } from "vitest";
import { ServiceEditorModal } from "@features/profile/stores/ServiceEditorModal";
import { makeValidServiceForm } from "@test/Resources/Market/catalog-factories";

describe("ServiceEditorModal", () => {
  it("blocks save when category is missing", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ServiceEditorModal
        open
        title="Nuevo servicio"
        initial={makeValidServiceForm({ category: "" })}
        categoryOptions={["Servicios"]}
        currencyOptions={["USD"]}
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    await user.click(screen.getByRole("button", { name: /guardar servicio/i }));
    expect(toast.error).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("calls onSave with valid form", async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(
      <ServiceEditorModal
        open
        title="Nuevo servicio"
        initial={makeValidServiceForm()}
        categoryOptions={["Servicios"]}
        currencyOptions={["USD"]}
        onClose={() => {}}
        onSave={onSave}
      />,
    );
    await user.click(screen.getByRole("button", { name: /guardar servicio/i }));
    expect(onSave).toHaveBeenCalled();
  });
});
