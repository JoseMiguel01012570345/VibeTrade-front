import type { StoreBadge } from '../../../app/store/useMarketStore'

export type ChatParticipantRole = 'buyer' | 'seller'

export type ChatParticipant = {
  id: string
  name: string
  role: ChatParticipantRole
  roleLabel: string
  trustScore: number
  verified?: boolean
}

/** Integrantes del hilo: comprador y vendedor (negocio). */
export function buildChatParticipants(
  buyer: { id: string; name: string; trustScore: number },
  seller: StoreBadge,
): ChatParticipant[] {
  return [
    {
      id: buyer.id,
      name: buyer.name,
      role: 'buyer',
      roleLabel: 'Comprador',
      trustScore: buyer.trustScore,
    },
    {
      id: seller.id,
      name: seller.name,
      role: 'seller',
      roleLabel: 'Vendedor',
      trustScore: seller.trustScore,
      verified: seller.verified,
    },
  ]
}
