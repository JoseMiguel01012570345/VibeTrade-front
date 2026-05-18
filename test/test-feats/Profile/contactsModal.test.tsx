import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ContactsModal } from "@features/profile/ContactsModal";

function renderContacts(open = true, onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <ContactsModal open={open} onClose={onClose} />
    </MemoryRouter>,
  );
}
import {
  mockAddContactByPhone,
  mockFetchContacts,
  mockRemoveContact,
} from "@test/Resources/Core/api-mocks";
import { makeContact } from "@test/Resources/Profile/profile-factories";

describe("ContactsModal", () => {
  it("loads contacts when opened", async () => {
    mockFetchContacts.mockResolvedValue([]);
    renderContacts();

    await waitFor(() => {
      expect(mockFetchContacts).toHaveBeenCalled();
    });
  });

  it("shows empty state", async () => {
    mockFetchContacts.mockResolvedValue([]);
    renderContacts();

    expect(
      await screen.findByText(/todavía no tienes contactos guardados/i),
    ).toBeInTheDocument();
  });

  it("adds a contact by phone", async () => {
    const added = makeContact({ displayName: "Nuevo Contacto" });
    mockFetchContacts.mockResolvedValue([]);
    mockAddContactByPhone.mockResolvedValue(added);

    const user = userEvent.setup();
    renderContacts();

    await screen.findByText(/todavía no tienes contactos/i);
    await user.type(
      screen.getByPlaceholderText(/\+54 9 11/i),
      "+54 9 11 9999-8888",
    );
    await user.click(screen.getByRole("button", { name: /añadir/i }));

    await waitFor(() => {
      expect(mockAddContactByPhone).toHaveBeenCalledWith("+54 9 11 9999-8888");
      expect(screen.getByText("Nuevo Contacto")).toBeInTheDocument();
    });
  });

  it("removes a contact", async () => {
    const c = makeContact();
    mockFetchContacts.mockResolvedValue([c]);
    const user = userEvent.setup();
    renderContacts();

    await screen.findByText(c.displayName);
    await user.click(
      screen.getByRole("button", { name: /eliminar contacto contacto uno/i }),
    );

    await waitFor(() => {
      expect(mockRemoveContact).toHaveBeenCalledWith(c.userId);
      expect(screen.queryByText(c.displayName)).not.toBeInTheDocument();
    });
  });

  it("shows error when load fails", async () => {
    mockFetchContacts.mockRejectedValue(new Error("sin red"));
    renderContacts();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("sin red");
    });
  });

  it("shows error when add fails", async () => {
    mockFetchContacts.mockResolvedValue([]);
    mockAddContactByPhone.mockRejectedValue(new Error("no registrado"));
    const user = userEvent.setup();
    renderContacts();

    await screen.findByText(/todavía no tienes contactos/i);
    await user.type(
      screen.getByPlaceholderText(/\+54 9 11/i),
      "+5491199998888",
    );
    await user.click(screen.getByRole("button", { name: /añadir/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("no registrado");
    });
  });
});
