import type { StoreBadge } from '../../../app/store/useMarketStore'

import type { ThreadChatCarrier } from '../../../app/store/marketStoreTypes'

export type ChatParticipantRole = 'buyer' | 'seller' | 'carrier'

export type ChatParticipant = {
  id: string
  name: string
  role: ChatParticipantRole
  roleLabel: string
  trustScore: number
  verified?: boolean
  avatarUrl?: string
  phone?: string
  detail?: string
}

/** Integrantes del hilo: comprador, vendedor (perfil: `ownerUserId` de la tienda si existe, si no `store.id`) y transportistas. */
export function buildChatParticipants(
  buyer: { id: string; name: string; trustScore: number; avatarUrl?: string },
  seller: StoreBadge,
  carriers?: ThreadChatCarrier[],
): ChatParticipant[] {
  const out: ChatParticipant[] = [
    {
      id: buyer.id,
      name: buyer.name,
      role: 'buyer',
      roleLabel: 'Comprador',
      trustScore: buyer.trustScore,
      avatarUrl: buyer.avatarUrl,
    },
    {
      id: seller.ownerUserId ?? seller.id,
      name: seller.name,
      role: 'seller',
      roleLabel: 'Vendedor',
      trustScore: seller.trustScore,
      verified: seller.verified,
      avatarUrl: seller.avatarUrl,
    },
  ]
  if (carriers?.length) {
    for (const c of carriers) {
      out.push({
        id: c.id,
        name: c.name,
        role: 'carrier',
        roleLabel: 'Transportista',
        trustScore: c.trustScore,
        phone: c.phone,
        detail: `${c.tramoLabel} · ${c.vehicleLabel}`,
      })
    }
  }
  return out
}
