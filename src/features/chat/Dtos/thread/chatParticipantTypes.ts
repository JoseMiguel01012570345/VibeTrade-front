export type ChatParticipantRole = "buyer" | "seller" | "carrier";

export type ChatParticipant = {
  id: string;
  name: string;
  role: ChatParticipantRole;
  roleLabel: string;
  trustScore: number;
  verified?: boolean;
  avatarUrl?: string;
  phone?: string;
  detail?: string;
  /** Destino al tocar la fila: vitrina del negocio (vendedor) o perfil (resto). */
  href: string;
};
