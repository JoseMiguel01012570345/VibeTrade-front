/** Imagen por defecto para servicios sin foto propia. */
export const TOOL_PLACEHOLDER_SRC = "/tool.png";

export function isToolPlaceholderUrl(src: string | undefined | null): boolean {
  if (!src) return false;
  const t = src.trim();
  if (t === TOOL_PLACEHOLDER_SRC) return true;
  if (t.endsWith("/tool.png")) return true;
  return false;
}
