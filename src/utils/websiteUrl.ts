/** Normaliza URL de sitio (opcional). Vacío → undefined. Sin esquema → https. */
export function normalizeOwnerWebsiteUrl(
  raw: string | undefined | null,
): string | undefined {
  const t = (raw ?? "").trim();
  if (!t) return undefined;
  let u = t;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    if (!parsed.hostname) return undefined;
    return parsed.href;
  } catch {
    return undefined;
  }
}

/** Etiqueta corta para UI (host + path resumido). */
export function websiteUrlDisplayLabel(href: string): string {
  try {
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname && u.pathname !== "/" ? u.pathname : "";
    const s = host + path;
    return s.length > 42 ? `${s.slice(0, 39)}…` : s;
  } catch {
    return href;
  }
}
