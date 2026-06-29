import type { UserContact } from "@features/profile/api/contactsApi";

export function contactPhoneLabel(c: UserContact): string {
  const d = c.phoneDisplay?.trim();
  if (d) return d;
  const digits = c.phoneDigits?.trim();
  if (digits) return `+${digits}`;
  return "—";
}

export function formatContactAddedAt(iso: string | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${datePart}, ${timePart}`;
}
