import { apiFetch } from "../http/apiClient";
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from "../http/apiErrorMessage";

export type UserContact = {
  userId: string;
  displayName: string;
  phoneDisplay: string | null;
  phoneDigits: string | null;
  /** ISO 8601 — cuándo se añadió el contacto (API actual). */
  createdAt?: string;
};

export async function fetchContacts(): Promise<UserContact[]> {
  const res = await apiFetch("/api/v1/auth/contacts");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()));
  }
  return (await res.json()) as UserContact[];
}

export async function addContactByPhone(phone: string): Promise<UserContact> {
  const res = await apiFetch("/api/v1/auth/contacts", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()));
  }
  return (await res.json()) as UserContact;
}

export async function removeContact(contactUserId: string): Promise<void> {
  const res = await apiFetch(
    `/api/v1/auth/contacts/${encodeURIComponent(contactUserId)}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    const t = await res.text().catch(() => "");
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()));
  }
}
