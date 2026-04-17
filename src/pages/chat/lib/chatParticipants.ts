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
  /** Destino al tocar la fila: vitrina del negocio (vendedor) o perfil (resto). */
  href: string
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
      href: `/profile/${buyer.id}`,
    },
    {
      id: seller.ownerUserId ?? seller.id,
      name: seller.name,
      role: 'seller',
      roleLabel: 'Vendedor',
      trustScore: seller.trustScore,
      verified: seller.verified,
      avatarUrl: seller.avatarUrl,
      href: `/store/${seller.id}/vitrina`,
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
        href: `/profile/${c.id}`,
      })
    }
  }
  return out
}
