export type ProfileSection = "account" | "reels" | "saved" | "stores";

const SECTIONS: readonly ProfileSection[] = ["account", "reels", "saved", "stores"];

export function isProfileSection(s: string): s is ProfileSection {
  return (SECTIONS as readonly string[]).includes(s);
}

/** Ruta canónica de una sección del perfil (tabs Cuenta / Reels / Tiendas). */
export function profileSectionPath(userId: string, section: ProfileSection): string {
  return `/profile/${encodeURIComponent(userId)}/${section}`;
}
