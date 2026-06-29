import type { SocialNetworkId } from "@features/auth/Dtos/userTypes";

export const PROFILE_SOCIAL_META: Record<
  SocialNetworkId,
  { title: string; hint: string; placeholder: string; short: string }
> = {
  instagram: {
    title: "Conectar Instagram",
    hint: "Puedes guardar tu @usuario o un enlace a tu perfil.",
    placeholder: "@mi_empresa o https://instagram.com/…",
    short: "Instagram",
  },
  telegram: {
    title: "Conectar Telegram",
    hint: "Usuario público (sin @) o enlace t.me/…",
    placeholder: "usuario o https://t.me/…",
    short: "Telegram",
  },
  x: {
    title: "Conectar X",
    hint: "Tu @ de X o enlace al perfil.",
    placeholder: "@empresa",
    short: "X",
  },
};
