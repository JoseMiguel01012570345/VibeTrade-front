const GUEST_ID_KEY = "vt_guest_id";

function safeGet(): string | null {
  try {
    return sessionStorage.getItem(GUEST_ID_KEY);
  } catch {
    return null;
  }
}

function safeSet(v: string) {
  try {
    sessionStorage.setItem(GUEST_ID_KEY, v);
  } catch {
    /* ignore */
  }
}

function randomId(): string {
  // prefer crypto UUID when available
  const c = globalThis.crypto as Crypto | undefined;
  const maybe = c?.randomUUID;
  if (typeof maybe === "function") return maybe.call(c);
  return `guest_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function getOrCreateGuestId(): string {
  const existing = (safeGet() ?? "").trim();
  if (existing.length >= 8) return existing;
  const next = randomId();
  safeSet(next);
  return next;
}

