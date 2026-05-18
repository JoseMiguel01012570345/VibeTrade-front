import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { ContactsModal } from "@features/profile/ContactsModal";

export function renderContactsModal(open = true, onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <ContactsModal open={open} onClose={onClose} />
    </MemoryRouter>,
  );
}
