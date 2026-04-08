export type ProfileSection = "account" | "reels" | "stores";

const SECTIONS: readonly ProfileSection[] = ["account", "reels", "stores"];

export function isProfileSection(s: string): s is ProfileSection {
  return (SECTIONS as readonly string[]).includes(s);
}

/** Ruta canónica de una sección del perfil (tabs Cuenta / Reels / Tiendas). */
export function profileSectionPath(userId: string, section: ProfileSection): string {
  return `/profile/${encodeURIComponent(userId)}/${section}`;
}
