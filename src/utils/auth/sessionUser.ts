import type { User } from "../../app/store/useAppStore";

export type SessionUserJson = {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Ignorado: los roles operativos solo existen en el contexto del chat. */
  role?: string;
  trustScore?: number;
  avatarUrl?: string;
  instagram?: string | null;
  telegram?: string | null;
  xAccount?: string | null;
};

function optionalString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/**
 * Convierte el JSON de sesión en `User`. Si una clave opcional no viene en el JSON,
 * no se define en el objeto (así al fusionar con `...s.me` no se pisa el valor en memoria).
 */
export function userFromSessionJson(j: SessionUserJson): User {
  const u: User = {
    id: j.id,
    name: typeof j.name === "string" ? j.name : "",
    email: typeof j.email === "string" ? j.email : "",
    phone: typeof j.phone === "string" ? j.phone : "",
    trustScore: typeof j.trustScore === "number" ? j.trustScore : 50,
  };
  if (Object.prototype.hasOwnProperty.call(j, "avatarUrl")) {
    u.avatarUrl = optionalString(j.avatarUrl);
  }
  if (Object.prototype.hasOwnProperty.call(j, "instagram")) {
    u.instagram = optionalString(j.instagram);
  }
  if (Object.prototype.hasOwnProperty.call(j, "telegram")) {
    u.telegram = optionalString(j.telegram);
  }
  if (Object.prototype.hasOwnProperty.call(j, "xAccount")) {
    u.xAccount = optionalString(j.xAccount);
  }
  return u;
}
