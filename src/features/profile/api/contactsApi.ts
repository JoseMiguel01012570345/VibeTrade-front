import { apiFetch } from "@shared/services/http/apiClient";
import { apiErrorTextToUserMessage, defaultUnexpectedErrorMessage } from "@shared/services/http/apiErrorMessage";
import type { PlatformUserByPhone, UserContact } from "../Dtos/contactsDtos";

export type { PlatformUserByPhone, UserContact } from "../Dtos/contactsDtos";

export async function fetchContacts(): Promise<UserContact[]> {
  const res = await apiFetch("/api/v1/auth/contacts");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()));
  }
  return (await res.json()) as UserContact[];
}

export async function resolvePlatformUserByPhone(
  phone: string,
): Promise<PlatformUserByPhone> {
  const q = new URLSearchParams()
  q.set('phone', phone)
  const res = await apiFetch(`/api/v1/auth/contacts/resolve?${q.toString()}`)
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(apiErrorTextToUserMessage(t, defaultUnexpectedErrorMessage()))
  }
  const j = (await res.json()) as {
    userId: string
    displayName: string
    phoneDisplay: string | null
    phoneDigits: string | null
  }
  return {
    userId: j.userId,
    displayName: j.displayName,
    phoneDisplay: j.phoneDisplay,
    phoneDigits: j.phoneDigits,
  }
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
